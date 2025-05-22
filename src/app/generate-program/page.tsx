import { vapi } from '@/lib/vapi';
import { useUser } from '@clerk/nextjs';
import { redirect, useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react'

const GenerateProgramPage
  = () => {

    const [callActive, setCallActive] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [messages, setMessages] = useState<any>([]);
    const [callEnded, setCallEnded] = useState(false);

    const { user } = useUser();
    const router = useRouter();

    const messageContainerRef = useRef<HTMLDivElement>(null);


    //Auto Scroll to latest messages
    useEffect(() => {
      if (messageContainerRef.current) {
        messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
      }

    }, [messages])

    //navigate user  to profile page after the call ends 
    useEffect(() => {
      if (callEnded) {
        const redirectTimer = setTimeout(() => {
          router.push("/profile");
        }, 1500)
        return () => clearTimeout(redirectTimer);
      }

    }, [callEnded, router]);


    //  Setup event listeners for vapi 
    useEffect(() => {

      const handleCallStart =()=>{
        console.log("Call Started");
        setConnecting(false);
        setCallActive(true);
        setCallEnded(false);
        
      }
      const handleCallEnd =()=>{
        console.log("Call Ended");
        setCallActive(false);
        setCallEnded(true);
        setConnecting(false);
        setIsSpeaking(false);
      }

      const handleSpeechStart =()=>{
        console.log("AI  Agent Started Speaking");
        setIsSpeaking(true);
      }
      const handleSpeechEnd=()=>{
        console.log("AI Agent stopped speaking");
        setIsSpeaking(false);
      }
      const handleMessage =(message:any)=>{
        if(message.type=== "transcript" && message.transcriptType==="final")
        {
          const newMessage = {content:message.transcript , role:message.role};
          setMessages((prev:any)=>[...prev , newMessage]);
        }

      };


      const handleError=(error:any)=>{
        console.log("Vapi Error" ,error);
        setConnecting(false);
        setCallActive(false);
      };


      vapi.on("call-start" , handleCallStart)
      .on("call-end", handleCallEnd)
      .on("speech-start" , handleSpeechStart)
      .on("speech-end" , handleSpeechEnd)
      .on("message", handleMessage)
      .on("error" , handleError);

      //cleanup event listeners on unmount 
      return ()=>{

          vapi
        .off("call-start", handleCallStart)
        .off("call-end", handleCallEnd)
        .off("speech-start", handleSpeechStart)
        .off("speech-end", handleSpeechEnd)
        .off("message", handleMessage)
        .off("error", handleError);
      }
     
    }, []);

    const toggleCall =async ()=>{
      if(callActive)
      {
        vapi.stop();
      }
      else{
        try {
           setConnecting(true);
           setMessages([]);
           setCallEnded(false);
           const fullName = user?.firstName
          ? `${user.firstName} ${user.lastName || ""}`.trim()
          : "There";
           await vapi.start(process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID!, {
          clientMessages: [],
          serverMessages: [],
          variableValues: {
            full_name: fullName,
            user_id: user?.id,
          },
        });


        } catch (error) {
            console.log("Failed to start call", error);
        setConnecting(false);
          
        }
      }

    }
    




    return (
      <div>
        Geneate Program Page
      </div>
    )
  }

export default GenerateProgramPage

