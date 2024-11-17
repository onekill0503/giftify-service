import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { DONATE_CONTRACT_ABI, SUSDE_CONTRACT_ABI } from "../json/abis";

export const getOwnerWallet = async (): Promise<Wallet> => {
  return new Wallet(process.env.OWNER_PRIVATE_KEY ?? "", await getProvider());
};

export const getProvider = async (): Promise<JsonRpcProvider> => {
  return new JsonRpcProvider(process.env.PROVIDER_URL ?? "");
};

export const getDonateContract = async (): Promise<Contract> => {
  return new Contract(
    process.env.DONATE_CONTRACT_ADDRESS ?? "",
    DONATE_CONTRACT_ABI,
    await getOwnerWallet()
  );
};

export const getSUSDContract = async (): Promise<Contract> => {
  return new Contract(
    process.env.SUSD_CONTRACT_ADDRESS ?? "",
    SUSDE_CONTRACT_ABI,
    await getOwnerWallet()
  );
};
