'use strict';

/**
 * Prisma seed script — replaces src/db/seed.sql.
 * Run via: npx prisma db seed   OR   npm run db:seed
 *
 * Idempotent: clears all sport event tables first, then truncates core
 * tables in dependency order before re-inserting. Safe to re-run locally.
 */

require('dotenv/config');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

// Seed needs its own client (not the singleton) so it can disconnect cleanly.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


async function main() {
  console.log('🌱 Seeding database…');

  // ── Wipe in reverse-dependency order ──────────────────────────────────────
  await prisma.$transaction([
    prisma.teamPlayer.deleteMany(),
    prisma.tournamentTeam.deleteMany(),
    prisma.matchCamera.deleteMany(),
    prisma.tournamentOrganizer.deleteMany(),
    prisma.basketballQuarter.deleteMany(),
    prisma.footballEvent.deleteMany(),
    prisma.cricketEvent.deleteMany(),
    prisma.matchState.deleteMany(),
    prisma.standing.deleteMany(),
    prisma.match.deleteMany(),
    prisma.tournament.deleteMany(),
    prisma.player.deleteMany(),
    prisma.team.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // ── Teams ─────────────────────────────────────────────────────────────────
  const [eng, sci, com, art, nbf, sbf, ewu, hh, ff] = await Promise.all([
    prisma.team.create({ data: { name: 'Engineering Eagles',  shortName: 'ENG', sport: 'cricket'    } }),
    prisma.team.create({ data: { name: 'Science Strikers',    shortName: 'SCI', sport: 'cricket'    } }),
    prisma.team.create({ data: { name: 'Commerce Chargers',   shortName: 'COM', sport: 'cricket'    } }),
    prisma.team.create({ data: { name: 'Arts Avengers',       shortName: 'ART', sport: 'cricket'    } }),
    prisma.team.create({ data: { name: 'North Block FC',      shortName: 'NBF', sport: 'football'   } }),
    prisma.team.create({ data: { name: 'South Block FC',      shortName: 'SBF', sport: 'football'   } }),
    prisma.team.create({ data: { name: 'East Wing United',    shortName: 'EWU', sport: 'football'   } }),
    prisma.team.create({ data: { name: 'Hostel Hoops',        shortName: 'HH',  sport: 'basketball' } }),
    prisma.team.create({ data: { name: 'Faculty Flyers',      shortName: 'FF',  sport: 'basketball' } }),
  ]);

  // ── Tournaments ───────────────────────────────────────────────────────────
  const [cricket_t, football_t, basketball_t] = await Promise.all([
    prisma.tournament.create({ data: {
      name: 'Inter-Dept Cricket Cup', sport: 'cricket',    format: 'league',
      startDate: new Date('2026-07-01'), endDate: new Date('2026-07-20'), status: 'ongoing', approvalStatus: 'approved',
    }}),
    prisma.tournament.create({ data: {
      name: 'Campus Football League',  sport: 'football',  format: 'league',
      startDate: new Date('2026-07-05'), endDate: new Date('2026-07-25'), status: 'ongoing', approvalStatus: 'approved',
    }}),
    prisma.tournament.create({ data: {
      name: 'Basketball Knockout',     sport: 'basketball', format: 'knockout',
      startDate: new Date('2026-07-10'), endDate: new Date('2026-07-15'), status: 'upcoming', approvalStatus: 'approved',
    }}),
  ]);

  await prisma.tournamentTeam.createMany({ data: [
    ...[eng, sci, com, art].map((team) => ({ tournamentId: cricket_t.id, teamId: team.id })),
    ...[nbf, sbf, ewu].map((team) => ({ tournamentId: football_t.id, teamId: team.id })),
    ...[hh, ff].map((team) => ({ tournamentId: basketball_t.id, teamId: team.id })),
  ]});

  // ── Matches ───────────────────────────────────────────────────────────────
  const [m1, m2, m3, m4, m5, m6] = await Promise.all([
    // Cricket — live
    prisma.match.create({ data: {
      tournamentId: cricket_t.id, teamAId: eng.id, teamBId: sci.id, sport: 'cricket',
      scheduledAt: new Date('2026-07-04T14:00:00Z'), status: 'live', activeCamera: 'camera1',
    }}),
    // Cricket — upcoming
    prisma.match.create({ data: {
      tournamentId: cricket_t.id, teamAId: com.id, teamBId: art.id, sport: 'cricket',
      scheduledAt: new Date('2026-07-06T14:00:00Z'), status: 'upcoming', activeCamera: 'camera1',
    }}),
    // Cricket — completed, ENG wins
    prisma.match.create({ data: {
      tournamentId: cricket_t.id, teamAId: eng.id, teamBId: com.id, sport: 'cricket',
      scheduledAt: new Date('2026-07-02T14:00:00Z'), status: 'completed', winnerTeamId: eng.id,
      activeCamera: 'camera1',
      replayUrl: 'https://ik.imagekit.io/demo/sample-video.mp4/ik-master.m3u8?tr=sr-360_480_720',
    }}),
    // Football — live
    prisma.match.create({ data: {
      tournamentId: football_t.id, teamAId: nbf.id, teamBId: sbf.id, sport: 'football',
      scheduledAt: new Date('2026-07-04T16:00:00Z'), status: 'live', activeCamera: 'camera2',
    }}),
    // Football — upcoming
    prisma.match.create({ data: {
      tournamentId: football_t.id, teamAId: ewu.id, teamBId: nbf.id, sport: 'football',
      scheduledAt: new Date('2026-07-08T16:00:00Z'), status: 'upcoming', activeCamera: 'camera1',
    }}),
    // Basketball — upcoming
    prisma.match.create({ data: {
      tournamentId: basketball_t.id, teamAId: hh.id, teamBId: ff.id, sport: 'basketball',
      scheduledAt: new Date('2026-07-10T18:00:00Z'), status: 'upcoming', activeCamera: 'camera1',
    }}),
  ]);

  // ── Live match states ─────────────────────────────────────────────────────
  await Promise.all([
    // Cricket live: ENG 142/3 in 18.4 overs
    prisma.matchState.create({ data: {
      matchId: m1.id, teamAScore: 142, teamBScore: 0,
      period: 18, periodLabel: 'Over 18.4', status: 'live',
      extra: { wickets: 3, overs: 18.4, run_rate: 7.61, batting_team: 'a', second_innings: false },
    }}),
    // Football live: NBF 2-1 SBF at 67'
    prisma.matchState.create({ data: {
      matchId: m4.id, teamAScore: 2, teamBScore: 1,
      period: 2, periodLabel: "67'", status: 'live',
      extra: { minute: 67, half: 2 },
    }}),
    // Idle state rows for all other matches
    prisma.matchState.create({ data: { matchId: m2.id, status: 'break',     periodLabel: 'Not started'  } }),
    prisma.matchState.create({ data: { matchId: m3.id, status: 'completed', periodLabel: 'Match ended'  } }),
    prisma.matchState.create({ data: { matchId: m5.id, status: 'break',     periodLabel: 'Not started'  } }),
    prisma.matchState.create({ data: { matchId: m6.id, status: 'break',     periodLabel: 'Not started'  } }),
  ]);

  // ── Cricket over history (match 1) ────────────────────────────────────────
  await prisma.cricketEvent.createMany({ data: [
    { matchId: m1.id, innings: 1, overNumber: 5.0,  battingTeamId: eng.id, runsTotal: 38,  wickets: 0, runRate: 7.60, extras: 2, description: 'Steady start'       },
    { matchId: m1.id, innings: 1, overNumber: 10.0, battingTeamId: eng.id, runsTotal: 74,  wickets: 1, runRate: 7.40, extras: 3, description: 'First wicket falls'  },
    { matchId: m1.id, innings: 1, overNumber: 15.0, battingTeamId: eng.id, runsTotal: 118, wickets: 2, runRate: 7.87, extras: 5, description: 'Acceleration'        },
    { matchId: m1.id, innings: 1, overNumber: 18.4, battingTeamId: eng.id, runsTotal: 142, wickets: 3, runRate: 7.61, extras: 6, description: 'Death overs'         },
  ]});

  // ── Football timeline (match 4) ───────────────────────────────────────────
  await prisma.footballEvent.createMany({ data: [
    { matchId: m4.id, half: 1, minute: 12, eventType: 'goal',        teamId: nbf.id, playerName: 'A. Sharma' },
    { matchId: m4.id, half: 1, minute: 34, eventType: 'yellow_card', teamId: sbf.id, playerName: 'R. Khan'   },
    { matchId: m4.id, half: 2, minute: 58, eventType: 'goal',        teamId: sbf.id, playerName: 'M. Das'    },
    { matchId: m4.id, half: 2, minute: 63, eventType: 'goal',        teamId: nbf.id, playerName: 'A. Sharma' },
  ]});

  // ── Cricket standings (from completed match 3) ────────────────────────────
  await prisma.standing.createMany({ data: [
    { tournamentId: cricket_t.id, teamId: eng.id, played: 1, won: 1, lost: 0, drawn: 0, points: 2, scoredFor: 165, scoredAgainst: 150 },
    { tournamentId: cricket_t.id, teamId: com.id, played: 1, won: 0, lost: 1, drawn: 0, points: 0, scoredFor: 150, scoredAgainst: 165 },
    { tournamentId: cricket_t.id, teamId: sci.id, played: 0, won: 0, lost: 0, drawn: 0, points: 0, scoredFor: 0,   scoredAgainst: 0   },
    { tournamentId: cricket_t.id, teamId: art.id, played: 0, won: 0, lost: 0, drawn: 0, points: 0, scoredFor: 0,   scoredAgainst: 0   },
  ]});

  console.log('✅ Seed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
