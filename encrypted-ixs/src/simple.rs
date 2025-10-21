use arcis_imports::*;

#[encrypted]
mod simple_circuits {
    use arcis_imports::*;

    #[derive(ArcisType)]
    pub struct SimpleVote {
        pub voter: ArcisPubkey,
        pub choice: u8,
        pub amount: u64,
    }

    #[instruction]
    pub fn validate_vote(vote_ctxt: Enc<Shared, SimpleVote>) -> Enc<Shared, bool> {
        let vote = vote_ctxt.to_arcis();
        let is_valid = vote.choice <= 1 && vote.amount > 0;
        vote_ctxt.owner.from_arcis(is_valid)
    }
}