"use client";

import { MessagesView } from "@/components/app/MessagesView";

export default function MenteeMessagesPage() {
  return (
    <MessagesView
      description="Chat with your mentors."
      emptyDescription="Once a mentor accepts your match request, you can message them here."
    />
  );
}
