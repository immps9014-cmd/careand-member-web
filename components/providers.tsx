"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { SeniorModeEffect } from "@/components/senior-mode-effect";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1분
            gcTime: 5 * 60 * 1000, // 5분
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/* 시니어 모드는 로그인·가입 화면에도 적용돼야 해서 루트에 둔다 */}
      <SeniorModeEffect />
      {children}
      {process.env.NEXT_PUBLIC_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
