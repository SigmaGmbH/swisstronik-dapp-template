/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { useEffect, useMemo, useState } from "react";
import "./App.css";

import {
  createWeb3Modal,
  defaultConfig,
  useWeb3Modal,
  useWeb3ModalAccount,
  useWeb3ModalProvider,
} from "@web3modal/ethers5/react";
import ABI from "./ABI.json";
import { verificationTypes } from "@swisstronik/sdk/compliance/verificationDetails";
import { encryptDataField } from "@swisstronik/utils";
import { formatAddress, sendShieldedQuery } from "./utils";
import { Web3 } from "web3";

const {
  VITE_CONTRACT_ADDRESS: CONTRACT_ADDRESS,
  VITE_NODE_HTTP_URL: NODE_RPC_URL,
  VITE_WALLETCONNECT_PROJECT_ID: PROJECT_ID,
} = import.meta.env;

// 2. Set chains
const testnet = {
  chainId: 1291,
  name: "Swisstronik Testnet",
  currency: "SWTR",
  explorerUrl: "https://explorer-evm.testnet.swisstronik.com/",
  rpcUrl: NODE_RPC_URL,
};

// 3. Create a metadata object
const metadata = {
  name: "My Website",
  description: "My Website description",
  url: "https://mywebsite.com", // origin must match your domain & subdomain
  icons: ["https://avatars.mywebsite.com/"],
};

// 4. Create Ethers config
const ethersConfig = defaultConfig({
  metadata,
});

// 5. Create a Web3Modal instance
createWeb3Modal({
  ethersConfig,
  chains: [testnet],
  projectId: PROJECT_ID,
});

function App() {
  const { open } = useWeb3Modal();
  const { address } = useWeb3ModalAccount();
  const { walletProvider } = useWeb3ModalProvider();
  const [imageUrlFromContract, setImageUrlFromContract] = useState("");
  const [imageUrlFromInput, setImageUrlFromInput] = useState("");
  const [hash, setHash] = useState("");
  const [owner, setOwner] = useState("");
  const web3 = useMemo(() => new Web3(walletProvider as any), [walletProvider]);
  const contract = useMemo(
    () => new web3.eth.Contract(ABI, CONTRACT_ADDRESS),
    [web3]
  );

  useEffect(() => {
    (async () => {
      if (!contract || !address || !web3) return;
      try {
        const data = contract.methods.owner().encodeABI();
        const responseMessage = await sendShieldedQuery(
          web3,
          CONTRACT_ADDRESS,
          data as `0x${string}`
        );
        const owner = web3.eth.abi.decodeParameters(
          (ABI as any).find((x: any) => x.name === "owner")?.outputs,
          responseMessage
        )[0];
        console.log("Owner:", owner);

        setOwner(owner as string);
      } catch (error) {
        console.log(error);
      }
    })();
  }, [contract, address, web3]);

  const connectWallet = async () => {
    await open();
  };

  const sign = async () => {
    const msgParams = {
      domain: {
        chainId: 1291,
        name: "Sample Dapp",
        verifyingContract: CONTRACT_ADDRESS,
        version: "1",
      },
      message: {
        contents: "Sample Verification",
      },
      primaryType: "Obj",
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        Obj: [{ name: "contents", type: "string" }],
      },
    };

    return new Promise<{ signature: string }>((resolve, reject) => {
      walletProvider!.sendAsync!(
        {
          method: "eth_signTypedData_v4",
          params: [address, JSON.stringify(msgParams)],
        },
        (err: any, result: any) => {
          if (err) {
            reject(err);
            return;
          }
          if (result.error) {
            reject(result.error);
            return;
          }

          const signature: string = result.result;

          resolve({
            signature,
          });
        }
      );
    });
  };

  const setImageUrl = async () => {
    if (!imageUrlFromInput) {
      return alert("Please enter an image URL");
    }

    try {
      const data = contract.methods.setImageUrl(imageUrlFromInput).encodeABI();

      const [encryptedData] = await encryptDataField(NODE_RPC_URL, data);

      const receipt = await web3.eth.sendTransaction(
        {
          from: address,
          to: CONTRACT_ADDRESS,
          data: encryptedData,
          gasLimit: 1_000_000,
        },
        web3.eth.defaultReturnFormat,
        {
          checkRevertBeforeSending: false,
        }
      );

      console.log("Transaction receipt:", receipt);

      setHash(receipt.transactionHash.toString());
    } catch (error) {
      console.error(error);
    }
  };

  const getImageUrl = async (
    signature: string,
    issuerAddress: string,
    verificationType: (typeof verificationTypes)[number],
    adapterType: "Quadrata" | "WorldCoin"
  ) => {
    try {
      const contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);

      const verifType = verificationTypes.indexOf(verificationType);
      const adaptType = ["Quadrata", "WorldCoin"].indexOf(adapterType);

      if (verifType === -1) {
        return alert("Invalid verification type");
      }

      if (adaptType === -1) {
        return alert("Invalid adapter type");
      }

      const data = contract.methods
        .getImageUrl(signature, issuerAddress, verifType, adaptType)
        .encodeABI() as `0x${string}`;

      const responseMessage = await sendShieldedQuery(
        web3,
        CONTRACT_ADDRESS,
        data
      );

      const imageUrl = web3.eth.abi.decodeParameters(
        (ABI as any[]).find((x) => x.name === "getImageUrl")?.outputs,
        responseMessage
      )[0] as string;
      setImageUrlFromContract(imageUrl);
    } catch (error) {
      console.error(error);
    }
  };
  const generateSignature = async (adapterType: "Quadrata" | "WorldCoin") => {
    const { signature } = await sign();
    console.log("Signature:", signature);

    let issuerAddress = "";

    if (adapterType === "Quadrata") {
      issuerAddress = "0x971CD375a8799ca7F2366104e117C5497243C478"; //quadrata
    } else if (adapterType === "WorldCoin") {
      issuerAddress = "0x5563712d4923E3220cF94D53dD2f9765969dBac3"; //worldcoin
    }
    const verificationType = "VT_KYC";

    await getImageUrl(signature, issuerAddress, verificationType, adapterType);
  };

  return (
    <>
      <div className="card">
        <button onClick={connectWallet}>WalletConnect</button>
        <br />
        <br />
        {address && (
          <>
            <p>Connected account: {formatAddress(address)}</p>
          </>
        )}

        {hash && (
          <p>
            Transaction hash:
            <a
              href={`https://explorer-evm.testnet.swisstronik.com/tx/${hash}`}
              target="_blank"
              rel="noreferrer"
            >
              {formatAddress(hash)}
            </a>
          </p>
        )}

        {owner?.toLowerCase() === address?.toLowerCase() && (
          <div>
            <p>Set Image URL in Contract</p>
            <input
              type="url"
              placeholder="Image URL"
              value={imageUrlFromInput}
              onChange={(e) => setImageUrlFromInput(e.target.value)}
            />
            <button onClick={setImageUrl}>Set Image URL</button>
            <br />
            <br />
          </div>
        )}

        {!imageUrlFromContract && (
          <>
            <button onClick={() => generateSignature("Quadrata")}>
              Generate Signature to get Image with Quadrata
            </button>
            <br />
            <br />
            <button onClick={() => generateSignature("WorldCoin")}>
              Generate Signature to get Image with WorldCoin
            </button>
          </>
        )}

        {imageUrlFromContract && (
          <>
            <p>Image from Contract</p>
            <img
              src={imageUrlFromContract}
              style={{ maxWidth: "200px" }}
              alt="Sample"
            />
          </>
        )}
      </div>
    </>
  );
}

export default App;
