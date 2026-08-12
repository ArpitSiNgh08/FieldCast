import { TournamentEditor } from "@/components/TournamentEditor";
export default async function EditTournamentPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <TournamentEditor tournamentId={Number(id)}/>}
