import { encryptDataField, decryptNodeResponse } from "@swisstronik/utils";
import Web3 from "web3";

const { VITE_NODE_HTTP_URL: NODE_RPC_URL } = import.meta.env;
console.log({ NODE_RPC_URL });


export const formatAddress = (addr: string) => {
  return `${addr.substring(0, 7)}...${addr.substring(37)}`;
};

export async function sendShieldedQuery(
  web3: Web3,
  destination: `0x${string}`,
  data: `0x${string}`
) {
  // Encrypt the call data using SwisstronikJS's encryption function
  const [encryptedData, usedEncryptionKey] = await encryptDataField(
    NODE_RPC_URL as string,
    data
  );

  // Execute the query/call using the provider
  const response = await web3.eth.call({
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
