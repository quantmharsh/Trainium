import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Webhook } from "svix";
import { EmailAddress, WebhookEvent } from "@clerk/nextjs/server";
import { api } from "./_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
//setting up webhook from clerk to convex 
const http = httpRouter();
http.route({
    path: "/clerk-webhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const webhookSecret = process.env.CLERK_WEBHOOK_SECRET_KEY;
        console.log("Loaded webhook secret:", webhookSecret);

        if (!webhookSecret) {
            throw new Error("Missing clerk webhook secret key ");
        }
        const svix_id = request.headers.get("svix-id");
        const svix_signature = request.headers.get("svix-signature");
        const svix_timeStamp = request.headers.get("svix-timestamp");
        if (!svix_id || !svix_signature || !svix_timeStamp) {
            return new Response("No Svix headers found", {
                status: 400,
            })
        }

        const payload = await request.json();
        const body = JSON.stringify(payload);
        const wh = new Webhook(webhookSecret);
        let evt: WebhookEvent;
        try {
            evt = wh.verify(body, {
                "svix-id": svix_id,
                "svix-timestamp": svix_timeStamp,
                "svix-signature": svix_signature
            }) as WebhookEvent;
        } catch (error) {
            console.error("Error verifying webhook:", error);
            return new Response("Error Occured", { status: 400 });
        }


        //above code was just to verify the origin of event and check its authenticity
        // provide actions
        const eventType = evt.type;

        if (eventType === "user.created") {
            const { id, first_name, last_name, image_url, email_addresses } = evt.data;

            const email = email_addresses[0].email_address;
            const name = `${first_name || ""} ${last_name || ""}`.trim();

            try {
                await ctx.runMutation(api.users.syncUser, {
                    email,
                    name,
                    image: image_url,
                    clerkId: id
                })
                console.log("user Synced through clerk");

            } catch (error) {
                console.log("Error creating user:", error);
                return new Response("Error creating user", { status: 500 });

            }

        }
        if (eventType === "user.updated") {
            const { id, email_addresses, first_name, last_name, image_url } = evt.data;
            const email = email_addresses[0].email_address;
            const name = `${first_name || ""} ${last_name || ""}`.trim();


            try {
                await ctx.runMutation(api.users.updateUser, {
                    clerkId: id,
                    email,
                    name,
                    image: image_url,
                });
                console.log("user updated through clerk");

            } catch (error) {
                console.log("Error updating  user", error);
                return new Response("Error occured while updating user", {
                    status: 500
                })
            }

        }

        if (eventType === "user.deleted") {
            const { id } = evt.data;
            try {
                await ctx.runMutation(api.users.deleteUser, {
                    clerkId: id as string

                })
                console.log("user deleted through clerk");
            } catch (error) {
                console.log("Error occured while deleting user", error);
                return new Response("Error Updating user:", {
                    status: 500
                });

            }
        }
        return new Response("Webhooks processed successfully", { status: 200 });
    })

})


http.route({
    path:"/vapi/generate-program",
    method:"POST",
    handler: httpAction(async(ctx , request)=>{
        try {
          console.log("Getting  Payload ");
            //get the payload from request
            const payload= await request.json();
            console.log("Payload before spreading" , payload);
             const {
        user_id,
        age,
        height,
        weight,
        injuries,
        workout_days,
        fitness_goal,
        fitness_level,
        dietary_restrictions,
      } = payload;
        
      console.log("Payload :" , payload);


const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-001",
        generationConfig: {
          temperature: 0.4, // lower temperature for more predictable outputs 
          topP: 0.9,
          responseMimeType: "application/json",
        },
      });
      console.log("Gemini Model Selected"  , model);

// validate and fix workout plan to ensure it has proper numeric types
function validateWorkoutPlan(plan: any) {
  console.log("Validating workout plan");
  const validatedPlan = {
    schedule: plan.schedule,
    exercises: plan.exercises.map((exercise: any) => ({
      day: exercise.day,
      routines: exercise.routines.map((routine: any) => ({
        name: routine.name,
        sets: typeof routine.sets === "number" ? routine.sets : parseInt(routine.sets) || 1,
        reps: typeof routine.reps === "number" ? routine.reps : parseInt(routine.reps) || 10,
      })),
    })),
  };
  console.log("Validated Workout  plan " , validateDietPlan);
  return validatedPlan;
} 


// validate diet plan to ensure it strictly follows schema
function validateDietPlan(plan: any) {
  // only keep the fields we want
  const validatedPlan = {
    dailyCalories: plan.dailyCalories,
    meals: plan.meals.map((meal: any) => ({
      name: meal.name,
      foods: meal.foods,
    })),
  };
  return validatedPlan;
}

       const workoutPrompt = `You are an experienced fitness coach creating a personalized workout plan based on:
      Age: ${age}
      Height: ${height}
      Weight: ${weight}
      Injuries or limitations: ${injuries}
      Available days for workout: ${workout_days}
      Fitness goal: ${fitness_goal}
      Fitness level: ${fitness_level}
      
      As a professional coach:
      - Consider muscle group splits to avoid overtraining the same muscles on consecutive days
      - Design exercises that match the fitness level and account for any injuries
      - Structure the workouts to specifically target the user's fitness goal
      
      CRITICAL SCHEMA INSTRUCTIONS:
      - Your output MUST contain ONLY the fields specified below, NO ADDITIONAL FIELDS
      - "sets" and "reps" MUST ALWAYS be NUMBERS, never strings
      - For example: "sets": 3, "reps": 10
      - Do NOT use text like "reps": "As many as possible" or "reps": "To failure"
      - Instead use specific numbers like "reps": 12 or "reps": 15
      - For cardio, use "sets": 1, "reps": 1 or another appropriate number
      - NEVER include strings for numerical fields
      - NEVER add extra fields not shown in the example below
      
      Return a JSON object with this EXACT structure:
      {
        "schedule": ["Monday", "Wednesday", "Friday"],
        "exercises": [
          {
            "day": "Monday",
            "routines": [
              {
                "name": "Exercise Name",
                "sets": 3,
                "reps": 10
              }
            ]
          }
        ]
      }
      
      DO NOT add any fields that are not in this example. Your response must be a valid JSON object with no additional text.`;
      console.log("Sending workout plan");
   const workoutResult = await model.generateContent(workoutPrompt);
      const workoutPlanText = workoutResult.response.text();
      console.log("Got Workout plan" , workoutPlanText);

      // VALIDATE THE INPUT COMING FROM AI
      let workoutPlan = JSON.parse(workoutPlanText);
      workoutPlan = validateWorkoutPlan(workoutPlan);
      
const dietPrompt = `You are an experienced nutrition coach creating a personalized diet plan based on:
        Age: ${age}
        Height: ${height}
        Weight: ${weight}
        Fitness goal: ${fitness_goal}
        Dietary restrictions: ${dietary_restrictions}
        
        As a professional nutrition coach:
        - Calculate appropriate daily calorie intake based on the person's stats and goals
        - Create a balanced meal plan with proper macronutrient distribution
        - Include a variety of nutrient-dense foods while respecting dietary restrictions
        - Consider meal timing around workouts for optimal performance and recovery
        
        CRITICAL SCHEMA INSTRUCTIONS:
        - Your output MUST contain ONLY the fields specified below, NO ADDITIONAL FIELDS
        - "dailyCalories" MUST be a NUMBER, not a string
        - DO NOT add fields like "supplements", "macros", "notes", or ANYTHING else
        - ONLY include the EXACT fields shown in the example below
        - Each meal should include ONLY a "name" and "foods" array

        Return a JSON object with this EXACT structure and no other fields:
        {
          "dailyCalories": 2000,
          "meals": [
            {
              "name": "Breakfast",
              "foods": ["Oatmeal with berries", "Greek yogurt", "Black coffee"]
            },
            {
              "name": "Lunch",
              "foods": ["Grilled chicken salad", "Whole grain bread", "Water"]
            }
          ]
        }
        
        DO NOT add any fields that are not in this example. Your response must be a valid JSON object with no additional text.`;

      const dietResult = await model.generateContent(dietPrompt);
      const dietPlanText = dietResult.response.text();
       // VALIDATE THE INPUT COMING FROM AI
      let dietPlan = JSON.parse(dietPlanText);
      dietPlan = validateDietPlan(dietPlan);
      // return new Response()
            // save to our DB: CONVEX
            
      const planId = await ctx.runMutation(api.plans.createPlan, {
        userId: user_id,
        dietPlan,
        isActive: true,
        workoutPlan,
        name: `${fitness_goal} Plan - ${new Date().toLocaleDateString()}`,
      });

         return new Response(
        JSON.stringify({
          success: true,
          data: {
            planId,
            workoutPlan,
            dietPlan,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );

        } catch (error) {

               console.error("Error generating fitness plan:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
            
        }
    })

})



export default http;