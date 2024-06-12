import { encryptDataField, decryptNodeResponse } from "@swisstronik/utils";
import { providers } from "ethers";

const { VITE_NODE_HTTP_URL: NODE_RPC_URL } = import.meta.env;

export const formatAddress = (addr: string) => {
  return `${addr.substring(0, 7)}...${addr.substring(37)}`;
};

export async function sendShieldedQuery(
  provider: providers.Web3Provider,
  destination: `0x${string}`,
  data: `0x${string}`
) {
  // Encrypt the call data using SwisstronikJS's encryption function
  const [encryptedData, usedEncryptionKey] = await encryptDataField(
    NODE_RPC_URL as string,
    data
  );

  // Execute the query/call using the provider
  const response = await provider.call({
    to: destination,
    data: encryptedData,
  });

  // Decrypt the response using SwisstronikJS's decryption function
  const decryptedResponse = await decryptNodeResponse(
    NODE_RPC_URL as string,
    response,
    usedEncryptionKey
  );

  return "0x" + Buffer.from(decryptedResponse).toString("hex") as `0x${string}`;
}
