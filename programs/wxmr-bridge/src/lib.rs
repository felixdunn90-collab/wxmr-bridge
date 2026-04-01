use anchor_lang::prelude::*;

declare_id!("CHhFsbCVnsVvFCH1cQ43zfJKbXhKGF81EG5q9f97gBaS");

#[program]
pub mod wxmr_bridge {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
