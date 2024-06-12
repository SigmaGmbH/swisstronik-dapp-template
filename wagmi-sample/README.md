# Wagmi Template

Template for interacting with the Swisstronik testnet network using WalletConnect and Wagmi

## Requirements

NodeJS v20

## Technologies

Vite, React with Typescript, WalletConnect, Wagmi, Swisstronik Tesnet

## Run & Build

- Copy .env.example content in a .env file
- Paste your WalletConnect Project Id in the .env file  (get yours at https://cloud.walletconnect.com/ )
- Run `npm i`
- Run `npm run dev`
- Open your browser and go to http://localhost:5173


## Functionality

- The Contract owner can set an image url in the contract
- Only verified users are able to view that image

## Usage

- Connect your preferred provider by clicking the WalletConnect button
- You can change the image Url saved in the Sample Contract by selecting the contract owner account in your provider. An input will show up for you to enter the new url. Paste your url and submit the transaction
- You can view the image by selecting the verified user account in your provider. You need to generate a signature in order for the image to be displayed. (Only users with the appropriate verification can view that image). If your user account is verified with Quadrata, then click `Generate Signature to get Image with Quadrata`
