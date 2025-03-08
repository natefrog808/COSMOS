// src/index.js
import { createDreams, validateEnv } from "@daydreamsai/core";
import { cli } from "@daydreamsai/core/extensions";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

// Import context and actions
import { automationContext } from "./context/automationContext";
import * as actions from "./actions";

// Validate environment variables
validateEnv(
  z.object({
    ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  })
);

// Export the COSMOS agent creator function
export const COSMOS = {
  initialize: async (config = {}) => {
    const agent = await createDreams({
      model: anthropic("claude-3-opus-20240229"),
      extensions: [cli],
      context: automationContext,
      actions: Object.values(actions),
    });
    
    return {
      start: () => agent.start({
        id: `cosmos-${Date.now()}`,
        workspaceName: config.workspaceName || "COSMOS Automation"
      }),
      run: agent.run
    };
  }
};

// If this file is run directly, start the agent
if (require.main === module) {
  console.log("⚡ Starting COSMOS - Mind-Blowing CPU Automation Agent");
  COSMOS.initialize().then(cosmos => cosmos.start());
}
