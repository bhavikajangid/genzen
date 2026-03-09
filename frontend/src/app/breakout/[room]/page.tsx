import { LiveKitBreakoutRoom } from "@/components/LiveKitBreakoutRoom";

export default function BreakoutRoomPage({ params }: { params: { room: string } }) {
  return <LiveKitBreakoutRoom roomName={decodeURIComponent(params.room)} />;
}

