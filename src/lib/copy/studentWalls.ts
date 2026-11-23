/**
 * Words for My Work, the Class Gallery, My Videos and Record my video (docs/EXPERIENCE_DESIGN_BRIEF.md G6, J1, J2).
 * Every Vietnamese line here is drafted by the developer and not yet read by a Vietnamese speaker: `draft: true`.
 * early and young see the Vietnamese beneath; junior and teen only when the per-device switch is on.
 */
import type { CopyEntry } from "@/lib/copy/student";

export const wallsCopy = {
  // ---- My Work
  "myWork.title.kid": { en: "My wall", vi: "Bức tường của con", draft: true },
  "myWork.title": { en: "My Work", vi: "Bài của con", draft: true },
  "myWork.sub.kid": { en: "My work, with my teacher's words.", vi: "Bài của con, kèm lời cô giáo.", draft: true },
  "myWork.sub": { en: "Classwork your teacher scanned and shared with you, with their notes.", vi: "Bài trên lớp cô giáo đã quét và chia sẻ với con, kèm lời nhận xét.", draft: true },
  "myWork.empty": { en: "Nothing here yet. When your teacher shares your work, it will appear here.", vi: "Chưa có gì ở đây. Khi cô giáo chia sẻ bài của con, bài sẽ hiện ra ở đây.", draft: true },

  // ---- Class Gallery
  "classWall.title.kid": { en: "Our class wall", vi: "Bức tường của lớp", draft: true },
  "classWall.title": { en: "Class Gallery", vi: "Góc của lớp", draft: true },
  "classWall.sub.kid": { en: "Work my classmates shared.", vi: "Bài các bạn đã chia sẻ.", draft: true },
  "classWall.sub": { en: "Work from your class that classmates chose to share.", vi: "Bài của lớp mà các bạn đã chọn chia sẻ.", draft: true },
  "classWall.empty": { en: "Nothing shared yet. When a classmate shares and your teacher says yes, it will appear here.", vi: "Chưa có bài nào được chia sẻ. Khi một bạn chia sẻ và cô giáo đồng ý, bài sẽ hiện ra ở đây.", draft: true },
  "classWall.error": { en: "The class gallery did not open. Please try again in a little while.", vi: "Chưa mở được góc của lớp. Con thử lại sau một lát nhé.", draft: true },

  // ---- Cards (both walls)
  "card.homework": { en: "Homework", vi: "Bài tập", draft: true },
  "card.team": { en: "Team", vi: "Nhóm", draft: true },
  "card.openLink": { en: "Open link", vi: "Mở liên kết", draft: true },
  "card.openFile": { en: "Open file", vi: "Mở tệp", draft: true },
  "card.share": { en: "Share with my class", vi: "Chia sẻ với lớp", draft: true },
  "card.shared": { en: "Shared with your class", vi: "Đã chia sẻ với lớp", draft: true },
  "card.stopSharing": { en: "Stop sharing", vi: "Ngừng chia sẻ", draft: true },
  "card.waiting": { en: "Waiting for your teacher", vi: "Đang chờ cô giáo", draft: true },
  "card.cancel": { en: "Cancel", vi: "Hủy", draft: true },
  "card.declined": { en: "Your teacher chose not to share this", vi: "Cô giáo chọn không chia sẻ bài này", draft: true },

  // ---- My Videos
  "videos.title": { en: "My Videos", vi: "Video của con", draft: true },
  "videos.title.kid": { en: "My videos", vi: "Video của con", draft: true },
  "videos.sub.kid": { en: "My speaking, and my class's videos.", vi: "Việc nói của con và video của lớp.", draft: true },
  "videos.sub": { en: "How your speaking is growing, and the videos your class shared.", vi: "Việc nói của con đang tiến bộ ra sao, và các video lớp đã chia sẻ.", draft: true },
  "videos.foot": { en: "Video homework is recorded on the Homework page. Your teacher checks every video before anyone sees it.", vi: "Video bài tập được quay ở trang Bài tập. Cô giáo xem mọi video trước khi ai khác nhìn thấy.", draft: true },
  "videos.wallTitle": { en: "{name} videos", vi: "Video lớp {name}", draft: true },
  "videos.wallTitleBare": { en: "Class videos", vi: "Video của lớp", draft: true },
  "videos.wallHelp": { en: "Videos your classmates chose to share. Send them a heart.", vi: "Các video bạn bè đã chọn chia sẻ. Hãy gửi một trái tim.", draft: true },
  "videos.wallEmpty": { en: "No videos shared yet.", vi: "Chưa có video nào được chia sẻ.", draft: true },
  "videos.wallError": { en: "The class videos did not load. Please try again in a little while.", vi: "Chưa tải được video của lớp. Con thử lại sau một lát nhé.", draft: true },
  "videos.heart": { en: "Send a heart", vi: "Gửi trái tim", draft: true },
  "videos.unheart": { en: "Remove heart", vi: "Bỏ trái tim", draft: true },
  "videos.you": { en: "You", vi: "Con", draft: true },
  "videos.journey": { en: "My speaking journey", vi: "Hành trình nói của con", draft: true },
  "videos.journeyEmpty": { en: "Your speaking journey starts with your first video.", vi: "Hành trình nói của con bắt đầu từ video đầu tiên.", draft: true },
  "videos.journeyError": { en: "Your speaking journey did not load. Please try again in a little while.", vi: "Chưa tải được hành trình nói của con. Con thử lại sau một lát nhé.", draft: true },

  // ---- Record my video
  "record.title": { en: "Record my video", vi: "Quay video của em", draft: true },
  "record.empty": { en: "No videos to record right now.", vi: "Chưa có video nào cần quay.", draft: true },
  "record.seeVideos": { en: "See my videos", vi: "Xem video của con", draft: true },
  "record.todo": { en: "To record", vi: "Cần quay", draft: true },
  "record.sent": { en: "Sent", vi: "Đã gửi", draft: true },
  "record.all": { en: "All my videos", vi: "Tất cả video của con", draft: true },
  "record.loading": { en: "Looking for your videos", vi: "Đang tìm video của con", draft: true },
  "record.foot": { en: "Your teacher watches every video first.", vi: "Cô giáo sẽ xem video trước khi ai khác nhìn thấy.", draft: true },
  "record.approved": { en: "Your teacher watched it", vi: "Cô đã xem", draft: true },
  "record.withTeacher": { en: "With your teacher", vi: "Đã gửi cô giáo", draft: true },
  "record.again": { en: "Please record again", vi: "Hãy quay lại nhé", draft: true },
  "record.ready": { en: "Ready when you are", vi: "Sẵn sàng khi con muốn", draft: true },
} satisfies Record<string, CopyEntry>;

export type WallsCopyKey = keyof typeof wallsCopy;
