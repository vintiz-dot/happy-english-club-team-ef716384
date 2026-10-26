// Session status wins over stale or corrupt attendance, in both tuition readers.
export function isBillableTuitionSession(sessionStatus: string, attendanceStatus: string | undefined): boolean {
  return (sessionStatus === 'Scheduled' || sessionStatus === 'Held') &&
    (attendanceStatus === 'Present' || attendanceStatus === 'Absent' || attendanceStatus === 'Late');
}