/**
 * The class wallet, back on the child's home in every band (owner's decision): it is the class economy a teacher
 * switches on per class, part of the child's own game, not tuition. One StudentWallet for each enrolled class whose
 * economy mode is on, with exactly the props the old home passed; a class with economy mode off shows none. The
 * component itself is untouched. Tuition stays behind Grown-ups for the three younger bands.
 */
import { StudentWallet } from "@/components/student/StudentWallet";

export function ClassWallets({
  studentId,
  enrolledClasses,
  classPoints,
}: {
  studentId: string;
  enrolledClasses: any[];
  /** this class's all-time points, from the points summary the home already reads (economy is per class) */
  classPoints: (classId: string) => number;
}) {
  const wallets = enrolledClasses.filter((e) => e?.classes?.id && e.classes.economy_mode);
  if (wallets.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {wallets.map((e) => (
        <StudentWallet
          key={e.id}
          studentId={studentId}
          classId={e.classes.id}
          className={e.classes.name}
          totalPoints={classPoints(e.classes.id)}
          economyMode={e.classes.economy_mode}
          pointsToCashRate={e.classes.points_to_cash_rate || 50}
        />
      ))}
    </div>
  );
}
