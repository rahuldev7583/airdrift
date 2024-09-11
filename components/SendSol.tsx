"use client";

import { useToast } from "@/hooks/use-toast";
import React, { useState } from "react";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import LoadingSpinner from "./Loading";
import { fetchBalance } from "./GetBalance";
import { useRecoilState, useSetRecoilState } from "recoil";
import { sendSolState, solBalanceState } from "@/app/RecoilProvider";

interface SendSolProps {
  onClose: () => void;
}

const SendSol = ({ onClose }: SendSolProps) => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [sendSol, setSendSol] = useState({ toPublicKey: "", amount: "" });
  const [loading, setLoading] = useState(false);
  // const setSolBalance = useSetRecoilState(solBalanceState);
  const [solBalance, setSolBalance] = useRecoilState(solBalanceState);

  const { toast } = useToast();
  const setSendSolStatus = useSetRecoilState(sendSolState);

  async function sendSolana() {
    if (!wallet || !wallet.connected || !wallet.publicKey) {
      toast({
        variant: "destructive",
        title: `Please connect your wallet`,
      });
      return;
    }

    const amt = parseFloat(sendSol.amount);
    const balance = parseFloat(solBalance);

    if (!amt || amt <= 0) {
      toast({
        variant: "destructive",
        title: `Please enter a valid amount`,
      });
      setSendSol({ ...sendSol, amount: "" });
      return;
    }

    if (amt >= balance) {
      toast({
        variant: "destructive",
        title: `Insufficient balance`,
      });
      setSendSol({ ...sendSol, amount: "" });
      return;
    }
    let sendSolTo: PublicKey;
    try {
      sendSolTo = new PublicKey(sendSol.toPublicKey);
    } catch (error) {
      toast({
        variant: "destructive",
        title: `Invalid Recipient's address`,
      });
      setSendSol({ ...sendSol, toPublicKey: "" });
      return;
    }

    if (!PublicKey.isOnCurve(sendSolTo)) {
      toast({
        variant: "destructive",
        title: `Invalid Recipient's address on curve`,
      });
      return;
    }

    try {
      setLoading(true);
      const transaction = new Transaction();
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: sendSolTo,
          lamports: amt * LAMPORTS_PER_SOL,
        })
      );

      const signature = await wallet.sendTransaction(transaction, connection);
      // console.log("Transaction signature:", signature);

      let confirmed = false;
      while (!confirmed) {
        const status = await connection.getSignatureStatus(signature);
        if (status?.value?.confirmationStatus === "confirmed") {
          confirmed = true;
          console.log("Transaction confirmed");
        } else if (status?.value?.err) {
          throw new Error("Transaction failed");
        }
      }
      setSendSolStatus(false);
      setSendSol({ toPublicKey: "", amount: "" });
      setLoading(false);
    } catch (error) {
      console.error("Failed to send SOL:", error);
      toast({
        variant: "destructive",
        title: `Failed to send SOL`,
      });
    } finally {
      toast({
        title: `${amt} SOL has been transferred`,
      });
      fetchBalance(wallet, connection).then((balance) => {
        setSolBalance(balance);
      });
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="absolute bg-slate-800 text-gray-100 px-8 py-10 rounded-xl w-[35%] shadow-lg top-52">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-100"
        >
          ✖
        </button>
        <h2 className="text-xl font-semibold mb-4">Send SOL</h2>

        <label
          htmlFor="sendTo"
          className="block text-sm font-medium text-gray-300 mb-2"
        >
          Recipient&apos;s Public Key
        </label>
        <input
          id="sendTo"
          name="sendTo"
          type="text"
          className="border border-gray-500 p-2 rounded w-full mb-4 bg-gray-700 text-white"
          placeholder="Public Key"
          value={sendSol.toPublicKey}
          onChange={(e) =>
            setSendSol({ ...sendSol, toPublicKey: e.target.value })
          }
          disabled={loading}
        />

        <label
          htmlFor="amountToSend"
          className="block text-sm font-medium text-gray-300 mb-2"
        >
          Amount (in SOL)
        </label>
        <input
          id="amountToSend"
          name="amountToSend"
          type="number"
          min={0}
          className="border border-gray-500 p-2 rounded w-full mb-4 bg-gray-700 text-white"
          placeholder="Amount"
          value={sendSol.amount}
          onChange={(e) => setSendSol({ ...sendSol, amount: e.target.value })}
          disabled={loading}
        />

        <button
          onClick={sendSolana}
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? <LoadingSpinner message="Sending..." /> : "Send SOL"}
        </button>
      </div>
    </div>
  );
};

export default SendSol;
