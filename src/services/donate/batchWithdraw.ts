import { getDonateContract } from "../../utils/blockchain";

/**
 * function to execute batch withdraw if the batch withdraw amount is greater than the minimum batch withdraw amount
 * @returns {Promise<boolean>} return true if batch withdraw is successful
 */
const batchWithdraw = async (): Promise<boolean> => {
    const SmartContract = await getDonateContract();
    if(SmartContract.batchWithdrawAmount < SmartContract.batchWithdrawMin) return false;
    const executeWithdraw = await SmartContract.batchWithdraw();
    await executeWithdraw.wait();
    return true;
};

export default batchWithdraw;