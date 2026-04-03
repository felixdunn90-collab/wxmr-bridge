use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, MintTo, Token, TokenAccount};

declare_id!("CHhFsbCVnsVvFCH1cQ43zfJKbXhKGF81EG5q9f97gBaS");

#[program]
pub mod wxmr_bridge {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, authority: Pubkey) -> Result<()> {
        let state = &mut ctx.accounts.bridge_state;
        state.authority = authority;
        state.mint = ctx.accounts.mint.key();
        state.bump = ctx.bumps.bridge_state;
        Ok(())
    }

    // Called by the federation authority after confirming an XMR deposit
    pub fn mint_wxmr(
        ctx: Context<MintWxmr>,
        amount: u64,
        xmr_tx_hash: [u8; 32], // stored for audit trail
    ) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.bridge_state.authority,
            BridgeError::Unauthorized
        );

        let seeds = &[b"bridge_state".as_ref(), &[ctx.accounts.bridge_state.bump]];
        let signer = &[&seeds[..]];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.recipient_token_account.to_account_info(),
                    authority: ctx.accounts.bridge_state.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        emit!(MintEvent {
            recipient: ctx.accounts.recipient_token_account.owner,
            amount,
            xmr_tx_hash,
        });

        Ok(())
    }

    // Called by user to redeem wXMR back to XMR
    // xmr_address is the destination Monero address (95 bytes)
    pub fn burn_wxmr(
        ctx: Context<BurnWxmr>,
        amount: u64,
        xmr_address: [u8; 97],
    ) -> Result<()> {
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        // Federation nodes listen for this event and release XMR
        emit!(BurnEvent {
            user: ctx.accounts.user.key(),
            amount,
            xmr_address,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + BridgeState::INIT_SPACE,
        seeds = [b"bridge_state"],
        bump,
    )]
    pub bridge_state: Account<'info, BridgeState>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct MintWxmr<'info> {
    #[account(
        seeds = [b"bridge_state"],
        bump = bridge_state.bump,
    )]
    pub bridge_state: Account<'info, BridgeState>,
    #[account(mut, address = bridge_state.mint)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BurnWxmr<'info> {
    #[account(
        seeds = [b"bridge_state"],
        bump = bridge_state.bump,
    )]
    pub bridge_state: Account<'info, BridgeState>,
    #[account(mut, address = bridge_state.mint)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[account]
#[derive(InitSpace)]
pub struct BridgeState {
    pub authority: Pubkey, // federation multisig or single authority
    pub mint: Pubkey,      // wXMR token mint
    pub bump: u8,
}

#[event]
pub struct MintEvent {
    pub recipient: Pubkey,
    pub amount: u64,
    pub xmr_tx_hash: [u8; 32],
}

#[event]
pub struct BurnEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub xmr_address: [u8; 97],
}

#[error_code]
pub enum BridgeError {
    #[msg("Unauthorized: only the bridge authority can mint")]
    Unauthorized,
}