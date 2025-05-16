import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Webhook } from "svix";
import { EmailAddress, WebhookEvent } from "@clerk/nextjs/server";
import { api } from "./_generated/api";



//setting up webhook from clerk to convex 
const http= httpRouter();
http.route({
    path:"/clerk-webhook",
    method:"POST",
    handler:httpAction(async (ctx , request)=>{
        const webhookSecret= process.env.CLERK_WEBHOOK_SECRET;
        if(!webhookSecret)
        {
            throw new Error("Missong clerk webhook secret key ");
        }
        const svix_id =request.headers.get("svix-id");
        const svix_signature=request.headers.get("svix-signature");
        const svix_timeStamp=request.headers.get("svix-timestamp");
        if(!svix_id  || !svix_signature || !svix_timeStamp)
        {
            return new Response("No Svix headers found" , {
               status:400,
            })
        }

        const payload = await request.json() ;
        const body= JSON.stringify(payload);
        const wh = new Webhook(webhookSecret);
        let evt:WebhookEvent;
        try {
            evt=wh.verify(body , {
                "svix-id":svix_id,
                "svix-timestamp":svix_timeStamp,
                 "svix-signature":svix_signature
            }) as WebhookEvent;
        } catch (error) {
            console.error("Error verifying webhook:" ,error);
            return new Response("Error Occured" ,{status:400});
        }


        //above code was just to verify the origin of event and check its authenticity
        // provide actions
        const eventType=evt.type;

        if(eventType==="user.created")
        {
            const {id , first_name , last_name , image_url , email_addresses }=evt.data;

            const email =email_addresses[0].email_address;
            const name = `${first_name ||""} ${last_name ||""}`.trim();

            try {
                 await ctx.runMutation(api.users.syncUser , {
                    email ,
                    name ,
                    image:image_url ,
                    clerkId:id
                 }) 

            } catch (error) {
                 console.log("Error creating user:", error);
        return new Response("Error creating user", { status: 500 });
                
            }
            
        }
        if(eventType==="user.updated")
        {
            const{ id , email_addresses , first_name , last_name , image_url}=evt.data ;
            const email =email_addresses[0].email_address;
            const name = `${first_name || ""} ${last_name || ""}`.trim();


            try {
               await ctx.runMutation(api.users.updateUser ,{
                clerkId:id,
                email,
                name,
                image:image_url,
               });
                
            } catch (error) {
                console.log("Error updating  user",error);
                return new Response("Error occured while updating user",{
                    status:500
                })
            }
            
        }
           return new Response("Webhooks processed successfully", { status: 200 });
    })

})


export default http;