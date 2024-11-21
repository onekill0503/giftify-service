import { cron, Patterns } from "@elysiajs/cron";
import batchWithdraw from "../services/donate/batchWithdraw";
import unstakeWithdraw from "../services/donate/unstakeWithdraw";

/**
 * Cron job to execute the batch withdraw and unstake withdraw
 */
export default cron({
  name: `Giftify Withdraw Batch Execution`,
  pattern: Patterns.everyHours(1),
  run: async () => {
    try {
      await batchWithdraw();
      await unstakeWithdraw();
    }catch(error: any) {
      console.error(`[${new Date()}] ERROR: ${error.message}`);
    }
  },
});
