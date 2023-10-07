import { PostgrestResponse, SupabaseClient } from "@supabase/supabase-js";
import Decimal from "decimal.js";
import { Comment } from "../../../../types/payload";
import { Database } from "../../types/database";
import { Super } from "./Super";

type DebitInsert = Database["public"]["Tables"]["debits"]["Insert"];
type CreditInsert = Database["public"]["Tables"]["credits"]["Insert"];
type SettlementInsert = Database["public"]["Tables"]["settlements"]["Insert"];
type AddDebit = {
  userId: number;
  amount: Decimal;
  comment: Comment;
  networkId: number;
  address: string;
};
export class Settlement extends Super {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  private async _lookupTokenId(networkId: number, address: string): Promise<number> {
    const { data: tokenData, error: tokenError } = await this.client
      .from("tokens")
      .select("id")
      .eq("network", networkId)
      .eq("address", address)
      .single();

    if (tokenError) throw tokenError;
    if (!tokenData) throw new Error("Token not found");

    return tokenData.id;
  }

  public async addDebit({ userId, amount, comment, networkId, address }: AddDebit): Promise<void> {
    // Lookup the tokenId
    const tokenId = await this._lookupTokenId(networkId, address);

    // Insert into the debits table
    const debitData: DebitInsert = {
      amount: amount.toNumber(),
      node_id: comment.node_id,
      node_type: "IssueComment",
      node_url: comment.html_url,
      token_id: tokenId,
    };

    const { data: debitInsertData, error: debitError } = await this.client
      .from("debits")
      .insert(debitData)
      .select("*")
      .single();

    if (debitError) throw debitError;
    if (!debitInsertData) throw new Error("Debit not inserted");

    // Insert into the settlements table
    const settlementData: SettlementInsert = {
      id: debitInsertData.id,
      debit_id: debitInsertData.id,
      user_id: userId,
      location_id: debitInsertData.location_id, // Should be updated by trigger
    };

    const { data: settlementInsertData, error: settlementError } = await this.client
      .from("settlements")
      .insert(settlementData)
      .single();

    if (settlementError) throw settlementError;
    if (!settlementInsertData) throw new Error("Settlement not inserted");
  }

  public async addCredit({ userId, amount, comment }: AddDebit): Promise<void> {
    // Insert into the credits table
    const creditData: CreditInsert = {
      amount: amount.toNumber(),
      node_id: comment.node_id,
      node_type: "IssueComment",
      node_url: comment.html_url,
    };

    const { data: creditInsertData, error: creditError } = await this.client
      .from("credits")
      .insert(creditData)
      .select("*")
      .single();

    if (creditError) throw creditError;
    if (!creditInsertData) throw new Error("Credit not inserted");

    // Insert into the settlements table
    const settlementData: SettlementInsert = {
      id: creditInsertData.id,
      credit_id: creditInsertData.id,
      user_id: userId,
      location_id: creditInsertData.location_id, // Should be updated by trigger
    };

    const { data: settlementInsertData, error: settlementError } = await this.client
      .from("settlements")
      .insert(settlementData)
      .single();

    if (settlementError) throw settlementError;
    if (!settlementInsertData) throw new Error("Settlement not inserted");
  }

  public async getDebit(debitId: number): Promise<PostgrestResponse<DebitInsert>> {
    const { data: debitData, error: debitError } = await this.client
      .from("debits")
      .select("*")
      .eq("id", debitId)
      .single();

    if (debitError) throw debitError;
    if (!debitData) throw new Error("Debit not found");

    return debitData;
  }

  // public async getWalletFromSettlement(settlementId: number): Promise<PostgrestResponse<WalletRow>> {
  //   // try {
  //   const { data: settlementData, error: settlementError } = await this.client
  //     .from("settlements")
  //     .select("user_id")
  //     .eq("id", settlementId)
  //     .single();

  //   if (settlementError) throw settlementError;
  //   if (!settlementData) throw new Error("Settlement not found");

  //   const userId = settlementData.user_id;

  //   const { data: userData, error: userError } = await this.client
  //     .from("users")
  //     .select("wallet_id")
  //     .eq("id", userId)
  //     .single();

  //   if (userError) throw userError;
  //   if (!userData) throw new Error("User not found");

  //   const walletId = userData.wallet_id;

  //   const { data: walletData, error: walletError } = await this.client
  //     .from("wallets")
  //     .select("*")
  //     .eq("id", walletId)
  //     .single();

  //   if (walletError) throw walletError;

  //   return walletData; // { data: walletData, error: null, status: 200, body: JSON.stringify(walletData) };
  //   // } catch (error) {
  //   // return { data: null, error, status: 400, body: error.message };

  //   // }
  // }
}
