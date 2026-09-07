"use client";

import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { SessionProvider } from "next-auth/react";
import { getQueryClient } from "@/lib/queryClient";
import { addFocusedSeconds } from "@/lib/focusStats";

function FocusMinutesTicker() {
  React.useEffect(() => {
    const id = window.setInterval(() => {
      const active = window.localStorage.getItem("focusroom:session_active") === "1";
      if (active) addFocusedSeconds(1);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => getQueryClient());

  return (
    <SessionProvider>
      <FocusMinutesTicker />
      <QueryClientProvider client={client}>
        {children}
        {process.env.NODE_ENV === "development" ? <ReactQueryDevtools initialIsOpen={false} /> : null}
      </QueryClientProvider>
    </SessionProvider>
  );
}
