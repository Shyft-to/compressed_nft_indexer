import express from 'express';
import * as supaBase from '@supabase/supabase-js'
import morgan from 'morgan'
import bodyParser from "body-parser";
import { Network, ShyftSdk, TxnAction } from '@shyft-to/js';
import * as dotenv from "dotenv"
dotenv.config()

const shyftClient = new ShyftSdk({apiKey:process.env.SHYFT_KEY, network:Network.Devnet})

// ----------------------------- Shyft Data Query ----------------------------- 

//All NFTs
//const all_tokens = await shyftClient.wallet.getAllTokenBalance({wallet:'9NXMV79YpmPqbDtfcPkYW4V5vt2LHS2L6ZdZrXiR25JW'});
//console.log(all_tokens);

//Portfolio
// const portfolio = await shyftClient.wallet.getPortfolio({wallet:'9NXMV79YpmPqbDtfcPkYW4V5vt2LHS2L6ZdZrXiR25JW'});
// console.log(portfolio);


// // //All token balances
// const allTokens = await shyftClient.wallet.getAllTokenBalance({network:Network.Mainnet, wallet:"F8Vyqk3unwxkXukZFQeYyGmFfTG3CAX4v24iyrjEYBJV"});
// console.log("Tokens balances:",  allTokens);

// const pastTxns = await shyftClient.transaction.history({network: Network.Mainnet, account: "FSHZdx73rEGcS5JXUXvW6h8i4AtsrfPTHcgcbXLVUD3A"});
// console.log('Past txns: ', pastTxns);
//------------------------------- XXXXXXXXXXXXXXXXXXXXXXX --------------------------------

const app = express();

// using morgan for logs
app.use(morgan('combined'));

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

const supabase = supaBase.createClient(
  process.env.SUPABASE_PROJECT_URL,
  process.env.SUPABASE_API_KEY,
);


//------------------------------- NFT related functions --------------------------------
app.get('/nfts/:tree', async (req, res) => {
    const tree = req.params.tree;
    console.log(tree);
    const {data, error} = await supabase
        .from('nfts')
        .select('nft_address, owner, metadata')
        .eq('merkle_tree', tree)
        console.log(data, error);
    res.send(data);
});

app.post('/index/:tree', async (req, res) => {
    try {
        console.log(req.params.tree)
        const tree = req.params.tree;
        if (req.params.tree) {
            const response = await startCallback([tree]);
            res.send(response);
        }
        else {
            throw new Error('Some error occurred');
        }

    } catch (error) {
        res.send(error);
    }
});

app.post('/tree/monitor', async (req, res) => {
    try {
        if (req.body) {
            console.log(req.body);
            const txn = req.body;
            switch (txn.type) {
                case "COMPRESSED_NFT_MINT":
                    console.log('COMPRESSED_NFT_MINT action', txn.actions[0]);
                    const cnftMintAction = txn.actions.find((action)=> {return action.type == TxnAction.COMPRESSED_NFT_MINT})
                    console.log(cnftMintAction);
                    await handleMint(cnftMintAction);
                    break;
                case "COMPRESSED_NFT_TRANSFER":
                    console.log('COMPRESSED_NFT_TRANSFER action', txn.actions[0]);
                    const cnftTransferAction = txn.actions.find((action)=> {return action.type == TxnAction.COMPRESSED_NFT_TRANSFER})
                    console.log(cnftTransferAction);
                    await handleTransfer(cnftTransferAction);
                    break;
                case "COMPRESSED_NFT_BURN":
                    console.log('COMPRESSED_NFT_TRANSFER action', txn.actions[0]);
                    const cnftBurnAction = txn.actions.find((action)=> {return action.type == TxnAction.COMPRESSED_NFT_BURN})
                    console.log(cnftBurnAction);
                    handleBurn(cnftBurnAction);
                    break;
            
                default:
                    break;
            }
        }
        else {
            throw new Error('Some error occurred');
        }

    } catch (error) {
        res.send(error);
    }
});

async function handleMint(action) {
console.log('Mint detected: ', action);

const { data, error } = await supabase
    .from('nfts')
    .insert({merkle_tree: action.info.merkle_tree,
    'nft_address': action.info.nft_address,
    'metadata': action.info.nft_metadata,
    'owner': action.info.owner})
    .select();
    console.log(data);
}

async function handleTransfer(action) {
    //todo
}

async function handleBurn(action) {
    //todo
}

//------------------------------- XXXXXXXXXXXXXXXXXXXXXXX --------------------------------


//------------------------------- Callback related functions -----------------------------
async function startCallback(accounts) {
    try {
        const callbackRes = await shyftClient.callback.register({network:Network.Devnet, addresses: accounts, callbackUrl: process.env.CALLBACK_URL})
        console.log(callbackRes);
        return callbackRes;
    } catch (error) {
        
    }
}

async function stopCallback(accounts) {
    const callbackRes = await shyftClient.callback.register({network:Network.Devnet, addresses: accounts, callbackUrl: process.env.CALLBACK_URL})
    console.log(callbackRes);
}
//------------------------------- XXXXXXXXXXXXXXXXXXXXXXX --------------------------------

app.get('/', (req, res) => {
    res.send("Hi Encode Club, we are building a compressed NFT indexer. <3");
});

app.listen(3000, () => {
    console.log(`> Ready on http://localhost:3000`);
});