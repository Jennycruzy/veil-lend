import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  webpack: (config) => {
    const rpcWebsocketsV7 = path.dirname(
      require.resolve("rpc-websockets/package.json", {
        paths: [
          path.join(
            process.cwd(),
            "node_modules/.pnpm/rpc-websockets@7.11.2/node_modules"
          ),
        ],
      })
    );

    config.resolve.alias = {
      ...config.resolve.alias,
      "rpc-websockets/dist/lib/client$": path.join(
        rpcWebsocketsV7,
        "dist/lib/client.cjs"
      ),
      "rpc-websockets/dist/lib/client": path.join(
        rpcWebsocketsV7,
        "dist/lib/client.cjs"
      ),
      "rpc-websockets/dist/lib/client.js": path.join(
        rpcWebsocketsV7,
        "dist/lib/client.cjs"
      ),
      "rpc-websockets/dist/lib/client/websocket$": path.join(
        rpcWebsocketsV7,
        "dist/lib/client/websocket.cjs"
      ),
      "rpc-websockets/dist/lib/client/websocket": path.join(
        rpcWebsocketsV7,
        "dist/lib/client/websocket.cjs"
      ),
      "rpc-websockets/dist/lib/client/websocket.js": path.join(
        rpcWebsocketsV7,
        "dist/lib/client/websocket.cjs"
      ),
    };

    return config;
  },
};

export default nextConfig;
