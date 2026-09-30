"use client";

import { MessagesView } from "@/components/app/MessagesView";

export default function MentorMessagesPage() {
  return (
    <MessagesView
      description="Conversations with your mentees."
      emptyDescription="Accept a mentee's match request from Mentees and you can message them here."
    />
  );
}
