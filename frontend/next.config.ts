import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const isDev = process.env.NODE_ENV !== "production";

const withPWA = withPWAInit({
  dest: "public",
  disable: isDev,
  register: true,
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default isDev ? nextConfig : withPWA(nextConfig);
