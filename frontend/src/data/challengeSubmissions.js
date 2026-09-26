// Mock data for the Monthly Build Challenge leaderboard.
//
// TEMPORARY: Razee owns the real backend for this feature (Trello: "Monthly
// Build Challenge — Backend (submissions, votes, leaderboard logic)") —
// submission storage, vote counting, and the monthly reset are all still
// mock/in-memory here. This file exists so the frontend has something real
// to render and vote against; swap it for a fetch to Razee's API once that
// lands. The shape below (id, title, builderName, votes, photoLabel) is
// meant to match what that API will eventually return, so the screens
// shouldn't need to change much when it's wired up for real.

export const CHALLENGE_MONTH_LABEL = "September Build of the Month";
export const VOTING_CLOSES_LABEL = "Voting closes Sep 30";

export const initialSubmissions = [
  {
    id: "sub-climbing-wall",
    title: "Backyard Climbing Wall + Slide Combo",
    builderName: "Dana R.",
    votes: 142,
    photoLabel: "[photo]",
  },
  {
    id: "sub-homework-desk",
    title: "Fold-Down Homework Desk",
    builderName: "Marcus T.",
    votes: 98,
    photoLabel: "[photo]",
  },
  {
    id: "sub-reading-loft",
    title: "Corner Reading Loft",
    builderName: "Priya K.",
    votes: 76,
    photoLabel: "[photo]",
  },
  {
    id: "sub-dog-wash",
    title: "Dog Wash Station in the Mudroom",
    builderName: "James L.",
    votes: 61,
    photoLabel: "[photo]",
  },
];
