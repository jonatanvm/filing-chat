"use client";

import {Button} from "@/components/ui/button";
import * as React from "react";
import {useCallback, useEffect, useRef, useState} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {useConversation} from '@elevenlabs/react';
import {Orb} from "@/components/ui/orb"
import {cn} from "@/lib/utils";
import {CopyIcon} from "lucide-react";


async function requestMicrophonePermission() {
    try {
        await navigator.mediaDevices.getUserMedia({audio: true});
        return true;
    } catch {
        console.error("Microphone permission denied");
        return false;
    }
}

async function getSignedUrl(): Promise<string> {
    const response = await fetch("/api/signed-url");
    if (!response.ok) {
        throw Error("Failed to get signed url");
    }
    const data = await response.json();
    return data.signedUrl;
}

interface ChatHistory {
    message: string;
    source: "user" | "ai";
}

export function ConvAI() {
    const bottomRef = useRef<HTMLLIElement>(null)
    const [chatHistory, setChatHistory] = useState<ChatHistory[]>([])
    const [copied, setCopied] = useState<boolean>(false)
    const conversation = useConversation({
        onConnect: () => {
            console.log("connected");
        },
        onDisconnect: () => {
            console.log("disconnected");
        },
        onError: error => {
            console.log(error);
            alert("An error occurred during the conversation");
        },
        onMessage: message => {
            setChatHistory((prevState) => [...prevState, message]);
        },
        clientTools: {
            displayMessage: (parameters: { text: string }) => {
                alert(parameters.text);
                return 'Message displayed';
            },
        },
    });

    async function startConversation() {
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
            alert("No permission");
            return;
        }
        const signedUrl = await getSignedUrl();
        const conversationId = await conversation.startSession({
            signedUrl,
        });
        console.log(conversationId);
    }


    const stopConversation = useCallback(async () => {
        await conversation.endSession();
    }, [conversation]);


    function getAgentState() {
        if (conversation.status === "connected" && conversation.isSpeaking) {
            return "talking"
        }
        if (conversation.status === "connected") {
            return "listening";
        }
        if (conversation.status === "disconnected") {
            return null;
        }
        return null;
    }

    const handleCopy = async () => {
        let text = "";
        chatHistory.forEach((chat) => {
            text += `${chat.source}: ${chat.message}\n\n`
        })
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // reset after 2s
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };


    useEffect(() => {
        bottomRef.current?.scrollIntoView({behavior: "smooth"});
    }, [chatHistory])

    return (
        <div className={"flex justify-center items-center gap-x-10"}>
            <div className={'grid grid-cols-2 gap-2 w-[800px]'}>
                <Card className={"rounded-3xl"}>
                    <CardContent>
                        <CardHeader>
                            <CardTitle className={"text-center py-2"}>
                                {conversation.status === "connected"
                                    ? conversation.isSpeaking
                                        ? `Agent is speaking`
                                        : "Agent is listening"
                                    : "Disconnected"}
                            </CardTitle>
                        </CardHeader>
                        <div className={"flex flex-col gap-y-4 text-center items-center"}>
                            <Orb agentState={getAgentState()} className={'w-[250px] h-[250px]'}/>

                            <Button
                                variant={"outline"}
                                className={"rounded-full"}
                                size={"lg"}
                                disabled={
                                    conversation.status !== "disconnected"
                                }
                                onClick={startConversation}
                            >
                                Start conversation
                            </Button>
                            <Button
                                variant={"outline"}
                                className={"rounded-full"}
                                size={"lg"}
                                disabled={conversation.status === "disconnected"}
                                onClick={stopConversation}
                            >
                                End conversation
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                <Card className={"rounded-3xl flex flex-1"}>
                    <CardContent className={'w-full'}>
                        <CardHeader className={'w-full'}>
                            <CardTitle className={"flex items-center text-center justify-between w-full"}>
                                <span>Chat History</span>
                                <div className={'flex gap-1 items-center'}>
                                    {copied && (<span className={'text-xs italic'}>Copied!</span>)}
                                    <Button variant={'ghost'} size={'icon'} className={'ml-auto'}
                                            onClick={handleCopy}><CopyIcon/></Button>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <div className={"flex flex-col  text-sm"}>
                            {chatHistory.length > 0 ? (
                                <ul className={'flex flex-col gap-2 overflow-y-auto max-h-[400px]'}>
                                    {chatHistory.map((history, index) => (
                                        <li key={index}
                                            className={cn(' rounded-lg p-2', history.source === 'ai' ? 'mr-8 bg-gray-100' : 'ml-8 bg-blue-100')}>{history.message}</li>
                                    ))}
                                    <li ref={bottomRef}/>
                                </ul>
                            ) : (
                                <div className={'italic text-center'}>
                                    Empty
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
