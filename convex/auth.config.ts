export default {
  providers: [
    {
      domain: process.env.VITE_CLERK_FRONTEND_API_URL,
      applicationID: "convex",
    },
  ]
};
//using npm i  svix
//node package for crating a webhook  from clerk to convex (havn,t done this  in last project)