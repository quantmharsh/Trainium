"use client";
import { useQuery } from 'convex/react'
import React from 'react'
import { api } from '../../../convex/_generated/api'
import { useUser } from '@clerk/nextjs'



const ProfilePage = () => {
  const {user}= useUser();
  const userId = user?.id as string;
  const allPlans= useQuery(api.plans.getUserPlans ,{userId});
  console.log("All Plans of user" , allPlans);
  return (
    <div>ProfilePage</div>
  )
}

export default ProfilePage