import { createClient } from "redis";

const RedisClient = await createClient({
  url: process.env.REDIS_URL ?? `redis://root:root@localhost:6380`,
})
  .on("error", (error) => {
    console.log("Redis Client Error", error);
  })
  .connect();

const saveData = async (key: string, value: string) => {
  // save key with value and expire time 30 days
  await RedisClient.set(key, value, { EX: 60 * 60 * 24 * 30 });
};
const getData = async (key: string) => {
  return await RedisClient.get(key);
};
const deletedData = async (key: string) => {
  await RedisClient.del(key);
};
const updateData = async (key: string, value: string) => {
  await RedisClient.set(key, value, { EX: 60 * 60 * 24 * 30 });
};
export default { RedisClient, saveData, getData, deletedData, updateData };
