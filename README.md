# 🎯 SolVibes: Tinder-Style Prediction Markets on Arcium

**A privacy-preserving prediction markets platform that makes forecasting as addictive as social swiping**

![SwipePredict Demo](https://img.shields.io/badge/Status-Built%20on%20Arcium-purple?style=for-the-badge&logo=shield)
![Privacy](https://img.shields.io/badge/Privacy-MPC%20Encrypted-success?style=for-the-badge&logo=lock)
![Platform](https://img.shields.io/badge/Platform-Solana-blue?style=for-the-badge&logo=solana)

## 🚀 Quick Start

### Prerequisites
```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.16.0/install)"

# Install Anchor CLI
npm install -g @coral-xyz/anchor-cli

# Install Node.js dependencies
cd app && npm install
```

### Development Setup
```bash
# Clone and setup
git clone <repository-url>
cd zenithveil

# Frontend development
cd app && npm run dev

# Backend compilation (requires Arcium SDK)
anchor build  # Will fail until .arcis files are compiled
```

### Testing Commands

**Frontend Only (Working)**
```bash
cd app
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Check code quality
npm run type-check   # TypeScript validation
```

**Full Stack (Requires Arcium SDK)**
```bash
# First compile encrypted instructions
cd encrypted-ixs && arcis build  # Requires Arcium SDK

# Then build Solana programs
anchor build
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

## 📖 Project Structure

This project combines traditional Solana Anchor development with Arcium's encrypted computing capabilities:

- **`app/`** - Next.js frontend with Tinder-style UI
- **`programs/`** - Solana Anchor programs for market management
- **`encrypted-ixs/`** - Arcium encrypted instructions for private voting
- **`tests/`** - Integration tests for the full stack

### Architecture Overview

```
Frontend (Next.js + Framer Motion)
    ↓ (Encrypted Vote Data)
Arcium MPC Network (Rust + Arcis)
    ↓ (Aggregated Results)
Solana Program (Anchor + SPL)
    ↓ (Market State & Payouts)
Oracle Resolution System
```

## 🔐 Privacy-First Design

When working with plaintext data, we can edit it inside our program as normal. When working with confidential data though, state transitions take place off-chain using the Arcium network as a co-processor. For this, we then always need two instructions in our program: one that gets called to initialize a confidential computation, and one that gets called when the computation is done and supplies the resulting data. Additionally, since the types and operations in a Solana program and in a confidential computing environment are a bit different, we define the operations themselves in the `encrypted-ixs` dir using our Rust-based framework called Arcis. To link all of this together, we provide a few macros that take care of ensuring the correct accounts and data are passed for the specific initialization and callback functions:

```rust
// encrypted-ixs/add_together.rs

use arcis_imports::*;

#[encrypted]
mod circuits {
    use arcis_imports::*;

    pub struct InputValues {
        v1: u8,
        v2: u8,
    }

    #[instruction]
    pub fn add_together(input_ctxt: Enc<Shared, InputValues>) -> Enc<Shared, u16> {
        let input = input_ctxt.to_arcis();
        let sum = input.v1 as u16 + input.v2 as u16;
        input_ctxt.owner.from_arcis(sum)
    }
}

// programs/my_program/src/lib.rs

declare_id!("<some ID>");

#[arcium_program]
pub mod my_program {
    use super::*;

    pub fn init_add_together_comp_def(ctx: Context<InitAddTogetherCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, true, None, None)?;
        Ok(())
    }

    pub fn add_together(
        ctx: Context<AddTogether>,
        computation_offset: u64,
        ciphertext_0: [u8; 32],
        ciphertext_1: [u8; 32],
        pub_key: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        let args = vec![
            Argument::ArcisPubkey(pub_key),
            Argument::PlaintextU128(nonce),
            Argument::EncryptedU8(ciphertext_0),
            Argument::EncryptedU8(ciphertext_1),
        ];
        queue_computation(ctx.accounts, computation_offset, args, vec![], None)?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "add_together")]
    pub fn add_together_callback(
        ctx: Context<AddTogetherCallback>,
        output: ComputationOutputs,
    ) -> Result<()> {
        let bytes = if let ComputationOutputs::Bytes(bytes) = output {
            bytes
        } else {
            return Err(ErrorCode::AbortedComputation.into());
        };

        emit!(SumEvent {
            sum: bytes[48..80].try_into().unwrap(),
            nonce: bytes[32..48].try_into().unwrap(),
        });
        Ok(())
    }
}

#[queue_computation_accounts("add_together", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct AddTogether<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    // ... other required accounts
}

#[callback_accounts("add_together", payer)]
#[derive(Accounts)]
pub struct AddTogetherCallback<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    // ... other required accounts
    pub some_extra_acc: AccountInfo<'info>,
}

#[init_computation_definition_accounts("add_together", payer)]
#[derive(Accounts)]
pub struct InitAddTogetherCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    // ... other required accounts
}
```
