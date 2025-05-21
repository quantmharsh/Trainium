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

    }, [callEnded, router])

    return (
      <div>
        Geneate Program Page
      </div>
    )
  }

export default GenerateProgramPage

