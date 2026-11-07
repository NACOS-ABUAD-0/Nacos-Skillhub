"use client";

import { MessagesView } from "@/components/app/MessagesView";

export default function AdminMessagesPage() {
  return (
    <MessagesView
      description="Start or continue a conversation with anyone in the hub."
      emptyDescription="There are no other user accounts to message yet."
      includeAllProfiles
    />
  );
}
