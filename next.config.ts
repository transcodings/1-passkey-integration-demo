import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: "/.well-known/webauthn",
      headers: [
        {
          key: "Content-Type",
          value: "application/json; charset=utf-8",
        },
      ],
    },
  ],
};

export default nextConfig;
