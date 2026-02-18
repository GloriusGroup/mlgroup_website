import { serve } from "bun";
import design5 from "./design5/index.html";

const server = serve({
  routes: {
    "/": design5,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
console.log(`   Design 1 (Red + White):     ${server.url}1`);
console.log(`   Design 2 (Violet + Gold):   ${server.url}2`);
console.log(`   Design 3 (Forest + Sage):   ${server.url}3`);
console.log(`   Design 4 (Slate + Amber):   ${server.url}4`);
console.log(`   Design 5 (Ocean + Cyan):    ${server.url}5`);
