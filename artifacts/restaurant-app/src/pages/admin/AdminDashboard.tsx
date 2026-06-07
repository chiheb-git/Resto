import { useGetDashboardStats, useGetOrdersByStatus } from "@workspace/api-client-react";
import { useTheme } from "next-themes";
const CARD=CARD,BORDER=BORDER,TEXT="#fff",MUTED="#888",ORANGE="#FF6B00";
const COLORS=["#FF6B00","#0096FF","#FF3232","#00D264","#888"];
const SL:Record<string,string>={pending:"En attente",confirmed:"Confirmee",refused:"Refusee",ready:"Prete",delivered:"Livree"};
export default function AdminDashboard(){
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const BG = isDark ? "#0A0A0A" : "#F5F5F0";
  const CARD = isDark ? CARD : TEXT;
  const BORDER = isDark ? BORDER : "#E0DED8";
  const TEXT = isDark ? TEXT : "#111111";
  const MUTED = isDark ? MUTED : "#666666";
  const{data:stats,isLoading}=useGetDashboardStats({query:{refetchInterval:10000}as any});
  const{data:obs=[]}=useGetOrdersByStatus({query:{refetchInterval:10000}as any});
  if(isLoading||!stats)return <div style={{padding:16,color:TEXT}}>Chargement...</div>;
  const pie=(obs as{status:string;count:number}[]).map(d=>({name:SL[d.status]??d.status,value:d.count}));
  const tot=pie.reduce((s,d)=>s+d.value,0);
  const cards=[
    {l:"Revenu du jour",v:Number(stats.todayRevenue).toFixed(2)+" DA",c:ORANGE},
    {l:"Commandes",v:stats.todayOrders,c:"#0096FF"},
    {l:"En attente",v:stats.pendingOrders,c:"#FFB400"},
    {l:"Note moy.",v:Number(stats.avgRating).toFixed(1)+"/5",c:"#FFD700"},
    {l:"Tables",v:stats.activeTables,c:"#00D264"},
    {l:"Plats",v:stats.totalDishes,c:"#A855F7"},
  ];
  return(
    <div style={{padding:16,background:BG,minHeight:"100vh",fontFamily:"Inter,sans-serif"}}>
      <h1 style={{fontSize:20,fontWeight:800,color:TEXT,marginBottom:4}}>Dashboard</h1>
      <p style={{fontSize:12,color:MUTED,marginBottom:20}}>Performance du jour</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
        {cards.map(s=>(
          <div key={s.l} style={{background:CARD,border:"1px solid "+BORDER,borderRadius:16,padding:14}}>
            <div style={{fontSize:20,fontWeight:800,color:s.c,marginBottom:4}}>{String(s.v)}</div>
            <div style={{fontSize:11,color:MUTED}}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{background:CARD,border:"1px solid "+BORDER,borderRadius:16,padding:16}}>
        <p style={{fontSize:14,fontWeight:700,color:TEXT,marginBottom:12}}>Par statut</p>
        {pie.length===0?<p style={{color:MUTED,textAlign:"center"}}>Aucune commande</p>:(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {pie.map((item,i)=>(
              <div key={item.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:COLORS[i%COLORS.length]}}/>
                  <span style={{fontSize:13,color:TEXT}}>{item.name}</span>
                </div>
                <span style={{fontSize:13,fontWeight:700,color:COLORS[i%COLORS.length]}}>{item.value} ({tot?Math.round(item.value/tot*100):0}%)</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}