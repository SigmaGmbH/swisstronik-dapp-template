import { encryptDataField, decryptNodeResponse } from "@swisstronik/utils";
import { call } from "viem/actions";
import { Config } from "wagmi";


export const formatBalance = (rawBalance: string) => {
  const balance = (parseInt(rawBalance) / 1000000000000000000).toFixed(2);
  return balance;
};

export const formatChainAsNum = (chainIdHex: string) => {
  const chainIdNum = parseInt(chainIdHex);
  return chainIdNum;
};

export const formatAddress = (addr: string) => {
  return `${addr.substring(0, 7)}...${addr.substring(37)}`;
};

export async function sendShieldedQuery(
  config: Config,
  destination: `0x${string}`,
  data: `0x${string}`
) {
  const client = config.getClient();
  const nodeRpcUrl: string = client.transport.url;
  // Encrypt the call data using SwisstronikJS's encryption function
  const [encryptedData, usedEncryptionKey] = await encryptDataField(
    nodeRpcUrl,
    data
  );

  // Execute the query/call using the provider
  const {data: response} = await call(client, {
    to: destination,
    data: encryptedData as `0x${string}`,
  });

  // Decrypt the response using SwisstronikJS's decryption function
  const decryptedResponse = await decryptNodeResponse(
    nodeRpcUrl,
    response!,
    usedEncryptionKey
  );

  return "0x" + Buffer.from(decryptedResponse).toString("hex") as `0x${string}`;
}
