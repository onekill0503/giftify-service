import cron from "@elysiajs/cron";
import batchWithdraw from "../services/donate/batchWithdraw";
import unstakeWithdraw from "../services/donate/unstakeWithdraw";

/**
 * Cron job to execute the batch withdraw and unstake withdraw
 */
export default cron({
  name: `Giftify Withdraw Batch Execution`,
  pattern: `* 1 * * * *`,
  run: async () => {
    await batchWithdraw();
    await unstakeWithdraw();
  },
});
