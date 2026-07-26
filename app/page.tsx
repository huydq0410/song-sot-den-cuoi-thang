"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase";

type StatKey = "cash" | "savings" | "debt" | "health" | "morale";

type Effects = Partial<Record<StatKey, number>>;

type Choice = {
  label: string;
  hint: string;
  effects: Effects;
  result: string;
};

type GameEvent = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  choices: Choice[];
};

type Profile = {
  id: string;
  name: string;
  role: string;
  description: string;
  cash: number;
  savings: number;
  debt: number;
  health: number;
  morale: number;
  accent: string;
};

type GameState = {
  profileId: string;
  day: number;
  cash: number;
  savings: number;
  debt: number;
  health: number;
  morale: number;
  decisions: number;
};

type LastResult = {
  result: string;
  effects: Effects;
};

type LeaderboardEntry = {
  id: number;
  profile_id: string;
  score: number;
  created_at: string;
};

const STORAGE_KEY = "song-sot-cuoi-thang-v1";
const TOTAL_DAYS = 30;

const profiles: Profile[] = [
  {
    id: "office",
    name: "Minh",
    role: "Nhân viên văn phòng",
    description: "Thu nhập ổn định, nhưng có khoản trả góp và lịch làm việc khá căng.",
    cash: 15_500_000,
    savings: 5_000_000,
    debt: 3_000_000,
    health: 78,
    morale: 74,
    accent: "Ổn định",
  },
  {
    id: "student",
    name: "An",
    role: "Sinh viên năm cuối",
    description: "Chi tiêu gọn nhẹ, ít nợ nhưng tiền dự phòng cũng không nhiều.",
    cash: 6_500_000,
    savings: 2_000_000,
    debt: 0,
    health: 84,
    morale: 80,
    accent: "Thử thách",
  },
  {
    id: "freelancer",
    name: "Linh",
    role: "Freelancer sáng tạo",
    description: "Tinh thần tốt, thu nhập khá nhưng tháng này chưa chắc có thêm dự án.",
    cash: 11_000_000,
    savings: 4_000_000,
    debt: 1_000_000,
    health: 72,
    morale: 86,
    accent: "Biến động",
  },
];

const events: GameEvent[] = [
  {
    id: "rent",
    eyebrow: "Khoản bắt buộc",
    title: "Chủ nhà nhắn tin",
    description:
      "Tiền thuê nhà đến hạn sớm hơn bạn nhớ. Chủ nhà khá dễ tính, nhưng chỉ trong hôm nay.",
    choices: [
      {
        label: "Thanh toán đầy đủ",
        hint: "Giữ uy tín và ngủ ngon",
        effects: { cash: -4_500_000, morale: 4 },
        result: "Bạn xử lý gọn khoản lớn nhất tháng. Ví nhẹ đi, đầu óc nhẹ theo.",
      },
      {
        label: "Xin trả chậm 10 ngày",
        hint: "Giữ tiền mặt, đổi lấy áp lực",
        effects: { debt: 4_700_000, morale: -10 },
        result: "Chủ nhà đồng ý, kèm một khoản phí nhỏ. Đồng hồ bắt đầu đếm ngược.",
      },
    ],
  },
  {
    id: "lunch",
    eyebrow: "Chi tiêu hằng ngày",
    title: "Một tuần ăn trưa thế nào?",
    description:
      "Quán gần công ty vừa tăng giá. Bạn cần chọn chiến lược cho năm ngày làm việc tới.",
    choices: [
      {
        label: "Tự nấu mang đi",
        hint: "Tốn công, tiết kiệm đáng kể",
        effects: { cash: -350_000, health: 5, morale: -2 },
        result: "Hộp cơm không quá đẹp, nhưng ngon hơn bạn nghĩ và ví vẫn khỏe.",
      },
      {
        label: "Ăn ngoài cho tiện",
        hint: "Nhanh gọn và vui vẻ",
        effects: { cash: -850_000, health: -2, morale: 5 },
        result: "Bạn có thêm vài bữa chuyện trò vui. Chi phí nhỏ cộng lại khá nhanh.",
      },
      {
        label: "Mì gói qua tuần",
        hint: "Rẻ nhất, cơ thể phản đối",
        effects: { cash: -120_000, health: -12, morale: -5 },
        result: "Ngân sách được cứu, nhưng đến ngày thứ tư bạn không muốn nhìn thấy mì nữa.",
      },
    ],
  },
  {
    id: "phone",
    eyebrow: "Sự cố bất ngờ",
    title: "Điện thoại rơi vỡ màn hình",
    description:
      "Máy vẫn dùng được, nhưng cảm ứng chập chờn và công việc của bạn phụ thuộc vào nó.",
    choices: [
      {
        label: "Thay màn hình chính hãng",
        hint: "Đắt nhưng yên tâm",
        effects: { cash: -2_800_000, morale: 6 },
        result: "Điện thoại lại mượt như cũ. Hóa đơn thì không mượt lắm.",
      },
      {
        label: "Sửa ở cửa hàng gần nhà",
        hint: "Phương án cân bằng",
        effects: { cash: -1_250_000, morale: 1 },
        result: "Không hoàn hảo, nhưng đủ tốt để công việc tiếp tục.",
      },
      {
        label: "Dùng tạm thêm",
        hint: "Không mất tiền, mất kiên nhẫn",
        effects: { health: -4, morale: -9 },
        result: "Bạn giữ được tiền mặt và học cách chạm màn hình thật kiên nhẫn.",
      },
    ],
  },
  {
    id: "friend-wedding",
    eyebrow: "Quan hệ xã hội",
    title: "Thiệp cưới vừa tới",
    description:
      "Một người bạn cũ tổ chức đám cưới cuối tuần này. Hai người không còn nói chuyện thường xuyên.",
    choices: [
      {
        label: "Đi và mừng chu đáo",
        hint: "Giữ kết nối",
        effects: { cash: -1_500_000, morale: 10 },
        result: "Buổi tối vui hơn mong đợi. Một mối quan hệ cũ được nối lại.",
      },
      {
        label: "Gửi lời chúc và quà nhỏ",
        hint: "Lịch sự, vừa ngân sách",
        effects: { cash: -500_000, morale: 2 },
        result: "Bạn bè thông cảm. Bạn vẫn thể hiện được sự quan tâm.",
      },
      {
        label: "Im lặng",
        hint: "Không tốn tiền",
        effects: { morale: -7 },
        result: "Ví không đổi, nhưng tin nhắn chưa trả lời cứ nằm đó.",
      },
    ],
  },
  {
    id: "sale",
    eyebrow: "Cám dỗ",
    title: "Đợt giảm giá đúng món bạn thích",
    description:
      "Chiếc tai nghe trong danh sách mong muốn đang giảm 40%. Đồng hồ ưu đãi còn hai tiếng.",
    choices: [
      {
        label: "Mua ngay",
        hint: "Một niềm vui có giá",
        effects: { cash: -1_900_000, morale: 12 },
        result: "Âm nhạc hay hơn hẳn. Bạn cố không nhìn số dư tài khoản.",
      },
      {
        label: "Để qua 24 giờ",
        hint: "Chống mua sắm bốc đồng",
        effects: { morale: -2, savings: 300_000 },
        result: "Cơn muốn mua qua đi. Bạn chuyển một phần tiền sang tiết kiệm để tự thưởng.",
      },
    ],
  },
  {
    id: "health-check",
    eyebrow: "Sức khỏe",
    title: "Cơn đau răng quay lại",
    description:
      "Nó chưa quá nghiêm trọng, nhưng rõ ràng sẽ không tự biến mất.",
    choices: [
      {
        label: "Đi nha sĩ ngay",
        hint: "Xử lý sớm",
        effects: { cash: -1_600_000, health: 12, morale: 3 },
        result: "Vấn đề được xử lý trước khi trở nên nghiêm trọng hơn.",
      },
      {
        label: "Mua thuốc cầm chừng",
        hint: "Rẻ hơn hôm nay",
        effects: { cash: -180_000, health: -6, morale: -4 },
        result: "Cơn đau dịu lại, nhưng lời hẹn với nha sĩ chỉ bị dời đi.",
      },
    ],
  },
  {
    id: "side-job",
    eyebrow: "Cơ hội",
    title: "Một việc làm thêm cuối tuần",
    description:
      "Công việc trả khá tốt nhưng sẽ chiếm trọn hai ngày nghỉ của bạn.",
    choices: [
      {
        label: "Nhận việc",
        hint: "Thêm thu nhập, bớt năng lượng",
        effects: { cash: 2_200_000, health: -8, morale: -6 },
        result: "Khách hàng hài lòng và chuyển khoản đúng hẹn. Bạn cần một giấc ngủ dài.",
      },
      {
        label: "Giữ ngày nghỉ",
        hint: "Không kiếm thêm, hồi phục tốt",
        effects: { health: 9, morale: 8 },
        result: "Hai ngày chậm rãi giúp bạn lấy lại nhịp sống.",
      },
    ],
  },
  {
    id: "subscription",
    eyebrow: "Rò rỉ ngân sách",
    title: "Ba gói đăng ký cùng gia hạn",
    description:
      "Phim, nhạc và lưu trữ đám mây đều muốn trừ tiền vào sáng mai.",
    choices: [
      {
        label: "Giữ tất cả",
        hint: "Tiện nghi trọn vẹn",
        effects: { cash: -620_000, morale: 5 },
        result: "Mọi dịch vụ tiếp tục chạy. Bạn tự hứa tháng sau sẽ xem lại.",
      },
      {
        label: "Chỉ giữ thứ cần nhất",
        hint: "Cắt gọn hợp lý",
        effects: { cash: -190_000, morale: 1, savings: 200_000 },
        result: "Bạn mất vài tiện ích nhưng tìm lại được khoản tiền hay bị bỏ quên.",
      },
      {
        label: "Hủy toàn bộ",
        hint: "Quyết liệt tối đa",
        effects: { savings: 400_000, morale: -6 },
        result: "Không còn phí tự động. Buổi tối bỗng dài hơn một chút.",
      },
    ],
  },
  {
    id: "transport",
    eyebrow: "Di chuyển",
    title: "Xe máy cần bảo dưỡng",
    description:
      "Tiếng động lạ xuất hiện mỗi sáng. Thợ quen nói nên kiểm tra sớm.",
    choices: [
      {
        label: "Bảo dưỡng đầy đủ",
        hint: "An toàn về lâu dài",
        effects: { cash: -1_100_000, health: 5, morale: 3 },
        result: "Xe chạy êm trở lại. Một rủi ro lớn đã được loại bỏ.",
      },
      {
        label: "Chỉ thay dầu",
        hint: "Giải pháp tạm thời",
        effects: { cash: -250_000, health: -3 },
        result: "Tiếng động nhỏ hơn, nhưng chưa biến mất hoàn toàn.",
      },
      {
        label: "Đi xe buýt một tuần",
        hint: "Chậm hơn nhưng ít tốn",
        effects: { cash: -160_000, health: 2, morale: -4 },
        result: "Bạn mất thêm thời gian di chuyển nhưng tránh được một hóa đơn lớn.",
      },
    ],
  },
  {
    id: "bonus",
    eyebrow: "Tin vui",
    title: "Khoản thưởng nhỏ xuất hiện",
    description:
      "Bạn nhận được 1.800.000đ ngoài dự kiến. Tiền chưa có nhiệm vụ nào cả.",
    choices: [
      {
        label: "Chuyển hết vào tiết kiệm",
        hint: "Tương lai cảm ơn bạn",
        effects: { savings: 1_800_000, morale: 2 },
        result: "Quỹ dự phòng dày hơn. Cảm giác an toàn cũng tăng theo.",
      },
      {
        label: "Trả bớt nợ",
        hint: "Giảm gánh nặng",
        effects: { debt: -1_800_000, morale: 5 },
        result: "Con số nợ nhỏ lại đáng kể. Một quyết định không hào nhoáng nhưng hiệu quả.",
      },
      {
        label: "Chia đôi vui và để dành",
        hint: "Cân bằng hiện tại, tương lai",
        effects: { cash: 900_000, savings: 900_000, morale: 8 },
        result: "Bạn vừa có một bữa ăn ngon, vừa không quên mục tiêu dài hạn.",
      },
    ],
  },
  {
    id: "course",
    eyebrow: "Đầu tư bản thân",
    title: "Khóa học đúng kỹ năng bạn thiếu",
    description:
      "Giảng viên có uy tín, chương trình thực tế và học phí không hề nhẹ.",
    choices: [
      {
        label: "Đăng ký khóa đầy đủ",
        hint: "Đầu tư dài hạn",
        effects: { cash: -2_400_000, morale: 7 },
        result: "Bạn có thêm một kế hoạch học rõ ràng và động lực mới.",
      },
      {
        label: "Tìm tài liệu miễn phí",
        hint: "Tiết kiệm, cần kỷ luật",
        effects: { cash: -100_000, morale: 2 },
        result: "Tài liệu không thiếu. Thử thách thật sự là giữ lịch học.",
      },
      {
        label: "Để tháng sau",
        hint: "Không tác động ngân sách",
        effects: { morale: -3 },
        result: "Bạn giữ được tiền, nhưng cơ hội vẫn nằm trong danh sách chờ.",
      },
    ],
  },
  {
    id: "family",
    eyebrow: "Gia đình",
    title: "Nhà cần một khoản hỗ trợ",
    description:
      "Một chi phí sửa chữa phát sinh. Bạn không bắt buộc phải gánh hết, nhưng có thể san sẻ.",
    choices: [
      {
        label: "Gửi 2 triệu",
        hint: "Hỗ trợ trọn vẹn",
        effects: { cash: -2_000_000, morale: 10 },
        result: "Việc nhà được giải quyết nhanh. Bạn cảm thấy mình có ích.",
      },
      {
        label: "Gửi 800 nghìn",
        hint: "Giúp trong khả năng",
        effects: { cash: -800_000, morale: 5 },
        result: "Khoản hỗ trợ vừa sức vẫn tạo ra khác biệt.",
      },
      {
        label: "Hẹn tháng tới",
        hint: "Bảo vệ ngân sách hiện tại",
        effects: { morale: -8 },
        result: "Gia đình hiểu, nhưng bạn vẫn hơi áy náy.",
      },
    ],
  },
  {
    id: "rain",
    eyebrow: "Một ngày xấu trời",
    title: "Mưa lớn đúng giờ tan làm",
    description:
      "Đường ngập, xe công nghệ tăng giá và bạn đã có một ngày rất dài.",
    choices: [
      {
        label: "Đặt xe về ngay",
        hint: "Nhanh và khô ráo",
        effects: { cash: -320_000, health: 3, morale: 3 },
        result: "Bạn về nhà an toàn và khô ráo, dù giá chuyến xe hơi đau.",
      },
      {
        label: "Chờ mưa ngớt",
        hint: "Mất thời gian, không mất tiền",
        effects: { morale: -4 },
        result: "Một giờ sau đường dễ đi hơn. Bạn tranh thủ nghe hết một tập podcast.",
      },
      {
        label: "Tự chạy xe về",
        hint: "Nhanh nhưng mạo hiểm",
        effects: { health: -7, morale: -3 },
        result: "Bạn về được nhà, ướt sũng và mệt rã rời.",
      },
    ],
  },
  {
    id: "coffee",
    eyebrow: "Thói quen nhỏ",
    title: "Chiếc cà phê mỗi sáng",
    description:
      "Bạn nhận ra mình đã ghé quán 18 lần trong tháng trước.",
    choices: [
      {
        label: "Giữ nguyên thói quen",
        hint: "Niềm vui đều đặn",
        effects: { cash: -720_000, morale: 7 },
        result: "Các buổi sáng vẫn có mùi cà phê quen thuộc.",
      },
      {
        label: "Tự pha tại nhà",
        hint: "Tiết kiệm mà vẫn tỉnh táo",
        effects: { cash: -220_000, morale: 2, savings: 200_000 },
        result: "Sau vài lần thử, ly cà phê nhà làm đã khá ổn.",
      },
      {
        label: "Cai cà phê",
        hint: "Rẻ nhưng hơi liều",
        effects: { health: 3, morale: -8 },
        result: "Cơ thể cảm ơn bạn sau vài ngày đầu không mấy dễ chịu.",
      },
    ],
  },
  {
    id: "insurance",
    eyebrow: "Bảo vệ tương lai",
    title: "Gói bảo hiểm hết hạn",
    description:
      "Bạn có thể gia hạn ngay, chọn gói cơ bản hoặc chấp nhận khoảng trống bảo vệ.",
    choices: [
      {
        label: "Gia hạn đầy đủ",
        hint: "Chi phí lớn, an tâm lớn",
        effects: { cash: -1_800_000, health: 5, morale: 5 },
        result: "Một khoản chi ít thú vị, đổi lại là cảm giác an toàn.",
      },
      {
        label: "Chọn gói cơ bản",
        hint: "Bảo vệ vừa đủ",
        effects: { cash: -750_000, morale: 1 },
        result: "Bạn giữ được phần bảo vệ quan trọng nhất.",
      },
      {
        label: "Tạm bỏ qua",
        hint: "Giữ tiền mặt",
        effects: { morale: -5 },
        result: "Không có hóa đơn hôm nay, nhưng rủi ro vẫn còn đó.",
      },
    ],
  },
  {
    id: "old-stuff",
    eyebrow: "Dọn nhà",
    title: "Một góc phòng đầy đồ không dùng",
    description:
      "Máy ảnh cũ, ghế phụ và vài món đồ công nghệ có thể bán được.",
    choices: [
      {
        label: "Chụp ảnh và đăng bán",
        hint: "Tốn một buổi chiều",
        effects: { cash: 1_600_000, morale: 4 },
        result: "Phòng thoáng hơn, tài khoản cũng đầy hơn một chút.",
      },
      {
        label: "Tặng người cần",
        hint: "Không kiếm tiền, thêm niềm vui",
        effects: { morale: 11 },
        result: "Những món đồ cũ bắt đầu một vòng đời mới.",
      },
      {
        label: "Để hôm khác",
        hint: "Không thay đổi gì",
        effects: { morale: -2 },
        result: "Góc phòng vẫn ở đó và lời hứa cũng vậy.",
      },
    ],
  },
  {
    id: "outing",
    eyebrow: "Bạn bè",
    title: "Nhóm bạn rủ đi chơi xa",
    description:
      "Chuyến đi hai ngày nghe rất hấp dẫn, nhưng không nằm trong kế hoạch tháng này.",
    choices: [
      {
        label: "Đi hết mình",
        hint: "Kỷ niệm đáng giá",
        effects: { cash: -2_600_000, health: -2, morale: 15 },
        result: "Bạn có một cuối tuần đáng nhớ và một album ảnh mới.",
      },
      {
        label: "Chỉ tham gia một ngày",
        hint: "Vui vừa đủ",
        effects: { cash: -900_000, morale: 8 },
        result: "Bạn không bỏ lỡ cuộc vui mà vẫn giữ ngân sách trong tầm kiểm soát.",
      },
      {
        label: "Hẹn dịp khác",
        hint: "Tiết kiệm tuyệt đối",
        effects: { morale: -6, savings: 250_000 },
        result: "Bạn chuyển một khoản nhỏ sang quỹ du lịch cho lần tới.",
      },
    ],
  },
  {
    id: "electricity",
    eyebrow: "Hóa đơn",
    title: "Tiền điện cao bất thường",
    description:
      "Tháng nóng khiến hóa đơn tăng mạnh. Bạn cần điều chỉnh cho những ngày còn lại.",
    choices: [
      {
        label: "Trả và dùng như cũ",
        hint: "Thoải mái là ưu tiên",
        effects: { cash: -1_050_000, health: 3, morale: 4 },
        result: "Căn phòng vẫn mát. Hóa đơn tháng sau có thể kể lại câu chuyện này.",
      },
      {
        label: "Trả và tiết kiệm điện",
        hint: "Thực tế, hơi nóng",
        effects: { cash: -1_050_000, health: -2, morale: -3, savings: 250_000 },
        result: "Bạn bắt đầu để ý từng thiết bị và tìm ra vài chỗ lãng phí.",
      },
    ],
  },
  {
    id: "loan",
    eyebrow: "Quyết định khó",
    title: "Bạn thân hỏi vay tiền",
    description:
      "Bạn ấy cần 2 triệu và hứa trả vào tháng sau. Hai người đã chơi với nhau nhiều năm.",
    choices: [
      {
        label: "Cho vay đủ",
        hint: "Tin tưởng bạn bè",
        effects: { cash: -2_000_000, morale: 6 },
        result: "Bạn giúp được một người quan trọng, dù quỹ an toàn mỏng đi.",
      },
      {
        label: "Chỉ hỗ trợ 500 nghìn",
        hint: "Rõ ràng trong khả năng",
        effects: { cash: -500_000, morale: 2 },
        result: "Bạn đặt giới hạn và vẫn giúp một phần.",
      },
      {
        label: "Từ chối khéo",
        hint: "Bảo vệ ranh giới",
        effects: { morale: -4 },
        result: "Cuộc trò chuyện hơi khó, nhưng tình hình tài chính của bạn được giữ nguyên.",
      },
    ],
  },
  {
    id: "medical",
    eyebrow: "Sự cố bất ngờ",
    title: "Một cơn sốt giữa tuần",
    description:
      "Cơ thể yêu cầu nghỉ ngơi, trong khi danh sách việc cần làm vẫn còn dài.",
    choices: [
      {
        label: "Khám bệnh và nghỉ một ngày",
        hint: "Ưu tiên hồi phục",
        effects: { cash: -650_000, health: 11, morale: 3 },
        result: "Bạn hồi phục nhanh hơn và quay lại công việc với đầu óc tỉnh táo.",
      },
      {
        label: "Tự mua thuốc rồi làm tiếp",
        hint: "Tiết kiệm thời gian",
        effects: { cash: -140_000, health: -8, morale: -5 },
        result: "Công việc vẫn chạy, còn cơ thể thì tiếp tục gửi cảnh báo.",
      },
    ],
  },
  {
    id: "cashback",
    eyebrow: "Khoản tiền bị quên",
    title: "Ví điện tử hoàn tiền",
    description:
      "Bạn bất ngờ nhận lại 600.000đ từ một chương trình cũ.",
    choices: [
      {
        label: "Bổ sung quỹ dự phòng",
        hint: "Một viên gạch nhỏ",
        effects: { savings: 600_000, morale: 2 },
        result: "Khoản tiền nhỏ tìm được một công việc quan trọng.",
      },
      {
        label: "Tự thưởng một bữa ngon",
        hint: "Niềm vui bất ngờ",
        effects: { cash: 250_000, morale: 9 },
        result: "Bạn tận hưởng món quà bất ngờ mà vẫn giữ lại một phần.",
      },
    ],
  },
  {
    id: "gym",
    eyebrow: "Sức khỏe",
    title: "Phòng gym mời gia hạn",
    description:
      "Giá tốt chỉ còn hôm nay, nhưng tháng trước bạn chỉ đến tập bốn lần.",
    choices: [
      {
        label: "Gia hạn một năm",
        hint: "Cam kết lớn",
        effects: { cash: -3_200_000, health: 9, morale: 5 },
        result: "Bạn vừa mua một lời cam kết. Giờ đến lúc biến nó thành thói quen.",
      },
      {
        label: "Mua theo tháng",
        hint: "Linh hoạt hơn",
        effects: { cash: -450_000, health: 5, morale: 2 },
        result: "Bạn có một tháng để chứng minh đây không phải quyết định bốc đồng.",
      },
      {
        label: "Tập miễn phí tại nhà",
        hint: "Không tốn tiền, cần tự giác",
        effects: { health: 3, morale: -1 },
        result: "Tấm thảm trong phòng khách trở thành phòng tập mới.",
      },
    ],
  },
  {
    id: "work-tools",
    eyebrow: "Công việc",
    title: "Máy tính bắt đầu chậm",
    description:
      "Nó vẫn chạy, nhưng mỗi tác vụ mất thêm vài phút và sự kiên nhẫn đang cạn dần.",
    choices: [
      {
        label: "Nâng cấp ngay",
        hint: "Hiệu suất đổi bằng tiền",
        effects: { cash: -3_500_000, morale: 10 },
        result: "Công việc trơn tru trở lại. Đây là khoản chi có lý do rõ ràng.",
      },
      {
        label: "Dọn máy và dùng tiếp",
        hint: "Tốn thời gian, tiết kiệm tiền",
        effects: { cash: -100_000, health: -2, morale: 2 },
        result: "Sau một buổi dọn dẹp, máy nhanh hơn đủ để tiếp tục.",
      },
    ],
  },
  {
    id: "investment",
    eyebrow: "Lời mời hấp dẫn",
    title: "Một kèo lợi nhuận “chắc chắn”",
    description:
      "Người quen rủ bạn góp vốn, hứa lợi nhuận 20% chỉ sau một tháng.",
    choices: [
      {
        label: "Từ chối",
        hint: "Không hiểu thì không xuống tiền",
        effects: { morale: 3, savings: 200_000 },
        result: "Bạn bỏ qua cảm giác sợ lỡ cơ hội và giữ nguyên nguyên tắc.",
      },
      {
        label: "Góp một khoản nhỏ",
        hint: "Thử vận may",
        effects: { cash: -1_000_000, morale: -4 },
        result: "Tiền đã chuyển đi. Sự chắc chắn bỗng không còn chắc như lời quảng cáo.",
      },
    ],
  },
  {
    id: "quiet-day",
    eyebrow: "Khoảng thở",
    title: "Một ngày không có kế hoạch",
    description:
      "Lịch trống hiếm hoi xuất hiện. Bạn có thể tiêu tiền để vui hoặc nghỉ ngơi thật sự.",
    choices: [
      {
        label: "Một ngày ở nhà",
        hint: "Hồi phục gần như miễn phí",
        effects: { cash: -120_000, health: 7, morale: 7 },
        result: "Một bữa ăn đơn giản và giấc ngủ trưa làm nên điều kỳ diệu.",
      },
      {
        label: "Đi xem phim và ăn tối",
        hint: "Đổi không khí",
        effects: { cash: -650_000, morale: 11 },
        result: "Bạn trở về nhà vui vẻ với một câu chuyện mới để kể.",
      },
      {
        label: "Nhận thêm việc",
        hint: "Biến thời gian thành tiền",
        effects: { cash: 900_000, health: -6, morale: -5 },
        result: "Ngày trống biến thành một ngày làm việc hiệu quả nhưng mệt mỏi.",
      },
    ],
  },
];

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function formatMoney(value: number) {
  return money.format(value);
}

function shortMoney(value: number) {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("vi-VN", {
      maximumFractionDigits: 1,
    })}tr`;
  }
  return `${Math.round(value / 1_000).toLocaleString("vi-VN")}k`;
}

function getEvent(day: number, profileId: string) {
  const profileOffset = profiles.findIndex((profile) => profile.id === profileId) * 5;
  return events[((day - 1) * 7 + profileOffset) % events.length];
}

function getScore(game: GameState) {
  const netWorth = game.cash + game.savings * 1.5 - game.debt * 1.2;
  return Math.max(
    0,
    Math.round(netWorth / 100_000 + game.health * 12 + game.morale * 8),
  );
}

function getEnding(game: GameState) {
  const score = getScore(game);

  if (game.cash < 0 || game.health <= 15 || game.morale <= 15) {
    return {
      title: "Qua tháng trong gang tấc",
      copy: "Bạn đã về đích, nhưng một chỉ số quan trọng đang báo động. Tháng sau cần một quỹ đệm rõ ràng hơn.",
      stamp: "Sống sót",
    };
  }
  if (score >= 1_850 && game.savings >= 4_000_000) {
    return {
      title: "Tay hòm chìa khóa",
      copy: "Bạn giữ được tiền, sức khỏe và cả niềm vui. Đây là một tháng được quản lý rất có chủ đích.",
      stamp: "Xuất sắc",
    };
  }
  if (score >= 1_350) {
    return {
      title: "Cân bằng có chiến lược",
      copy: "Không phải quyết định nào cũng hoàn hảo, nhưng bạn biết lúc nào nên chi và lúc nào nên dừng.",
      stamp: "Vững vàng",
    };
  }
  return {
    title: "Chuyên gia xoay xở",
    copy: "Bạn đã đi hết 30 ngày bằng một chuỗi lựa chọn rất thực tế. Vẫn còn chỗ để tháng sau nhẹ nhàng hơn.",
    stamp: "Kiên cường",
  };
}

function EffectPills({ effects }: { effects: Effects }) {
  const labels: Record<StatKey, string> = {
    cash: "Tiền mặt",
    savings: "Tiết kiệm",
    debt: "Nợ",
    health: "Sức khỏe",
    morale: "Tinh thần",
  };

  return (
    <div className="effect-pills" aria-label="Ảnh hưởng của lựa chọn">
      {(Object.entries(effects) as [StatKey, number][]).map(([key, value]) => {
        const isPositive = key === "debt" ? value < 0 : value > 0;
        const displayValue =
          key === "health" || key === "morale"
            ? `${value > 0 ? "+" : ""}${value}`
            : `${value > 0 ? "+" : ""}${shortMoney(value)}`;

        return (
          <span
            className={`effect-pill ${isPositive ? "positive" : "negative"}`}
            key={key}
          >
            {labels[key]} {displayValue}
          </span>
        );
      })}
    </div>
  );
}

function StatBar({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "health" | "morale";
}) {
  return (
    <div className="stat-bar">
      <div className="stat-bar-label">
        <span>{label}</span>
        <strong>{Math.round(value)}</strong>
      </div>
      <div
        className="stat-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
      >
        <span
          className={`stat-fill ${tone}`}
          style={{ width: `${clamp(value)}%` }}
        />
      </div>
    </div>
  );
}

export default function Home() {
  const [selectedProfile, setSelectedProfile] = useState("office");
  const [game, setGame] = useState<GameState | null>(null);
  const [screen, setScreen] = useState<"intro" | "playing" | "result">("intro");
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  const [savedGame, setSavedGame] = useState<GameState | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const loadSavedGame = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          setSavedGame(JSON.parse(saved) as GameState);
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      setIsReady(true);
    }, 0);

    return () => window.clearTimeout(loadSavedGame);
  }, []);

  useEffect(() => {
    if (!game || screen !== "playing") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  }, [game, screen]);

  const currentProfile = useMemo(
    () => profiles.find((profile) => profile.id === (game?.profileId ?? selectedProfile))!,
    [game?.profileId, selectedProfile],
  );

  const currentEvent = game ? getEvent(game.day, game.profileId) : null;

  function startGame(profileId: string) {
    const profile = profiles.find((item) => item.id === profileId)!;
    const newGame: GameState = {
      profileId: profile.id,
      day: 1,
      cash: profile.cash,
      savings: profile.savings,
      debt: profile.debt,
      health: profile.health,
      morale: profile.morale,
      decisions: 0,
    };

    setGame(newGame);
    setLastResult(null);
    setScreen("playing");
  }

  function resumeGame() {
    if (!savedGame) return;
    setGame(savedGame);
    setLastResult(null);
    setScreen("playing");
  }

  function choose(choice: Choice) {
    if (!game || lastResult) return;

    setGame({
      ...game,
      cash: game.cash + (choice.effects.cash ?? 0),
      savings: Math.max(0, game.savings + (choice.effects.savings ?? 0)),
      debt: Math.max(0, game.debt + (choice.effects.debt ?? 0)),
      health: clamp(game.health + (choice.effects.health ?? 0)),
      morale: clamp(game.morale + (choice.effects.morale ?? 0)),
      decisions: game.decisions + 1,
    });
    setLastResult({ result: choice.result, effects: choice.effects });
  }

  function nextDay() {
    if (!game) return;
    if (game.day >= TOTAL_DAYS) {
      window.localStorage.removeItem(STORAGE_KEY);
      setSavedGame(null);
      setScreen("result");
      return;
    }
    setGame({ ...game, day: game.day + 1 });
    setLastResult(null);
  }

  async function saveScore() {
    if (!game || cloudStatus === "saving" || cloudStatus === "saved") return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setCloudStatus("error");
      return;
    }

    setCloudStatus("saving");
    const score = getScore(game);
    const netWorth = game.cash + game.savings - game.debt;
    const { error } = await supabase.from("game_scores").insert({
      profile_id: game.profileId,
      score,
      net_worth: netWorth,
      savings: game.savings,
      debt: game.debt,
      health: Math.round(game.health),
      morale: Math.round(game.morale),
    });

    if (error) {
      setCloudStatus("error");
      return;
    }

    const { data } = await supabase
      .from("game_scores")
      .select("id, profile_id, score, created_at")
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(5);

    setLeaderboard((data ?? []) as LeaderboardEntry[]);
    setCloudStatus("saved");
  }

  function restart() {
    window.localStorage.removeItem(STORAGE_KEY);
    setSavedGame(null);
    setGame(null);
    setLastResult(null);
    setCloudStatus("idle");
    setLeaderboard([]);
    setScreen("intro");
  }

  if (!isReady) {
    return (
      <main className="loading-screen">
        <span className="loading-mark">₫</span>
        <p>Đang mở sổ tháng này…</p>
      </main>
    );
  }

  if (screen === "intro") {
    const previewProfile =
      profiles.find((profile) => profile.id === selectedProfile) ?? profiles[0];

    return (
      <main className="intro-shell">
        <header className="site-header">
          <a className="wordmark" href="#" aria-label="Sống sót đến cuối tháng">
            <span className="wordmark-icon">₫</span>
            <span>Sống Sót</span>
          </a>
          <div className="header-note">
            <span className="live-dot" />
            Một tháng giả lập
          </div>
        </header>

        <section className="hero">
          <div className="hero-copy">
            <div className="kicker">
              <span>Mini game tài chính</span>
              <i />
              <span>30 ngày</span>
            </div>
            <h1>
              Lương vừa về.
              <br />
              <em>Bạn giữ được bao lâu?</em>
            </h1>
            <p className="hero-lead">
              Mỗi ngày là một lựa chọn. Giữ tiền, giữ sức khỏe, giữ cả những niềm
              vui nhỏ — và cố sống sót đến cuối tháng.
            </p>
            <div className="hero-actions">
              <button
                className="primary-button"
                type="button"
                onClick={() => startGame(selectedProfile)}
              >
                Bắt đầu tháng mới
                <span aria-hidden="true">→</span>
              </button>
              {savedGame && (
                <button className="text-button" type="button" onClick={resumeGame}>
                  Chơi tiếp ngày {savedGame.day}
                </button>
              )}
            </div>
            <div className="micro-proof">
              <div className="avatar-stack" aria-hidden="true">
                <span>M</span>
                <span>A</span>
                <span>L</span>
              </div>
              <p>
                <strong>Không có đáp án hoàn hảo.</strong>
                <br />
                Chỉ có lựa chọn phù hợp với bạn.
              </p>
            </div>
          </div>

          <div className="setup-card">
            <div className="setup-card-top">
              <div>
                <span className="section-label">Hồ sơ tháng này</span>
                <h2>Chọn nhân vật</h2>
              </div>
              <span className="paper-clip" aria-hidden="true" />
            </div>

            <div className="profile-tabs" role="tablist" aria-label="Chọn nhân vật">
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  className={selectedProfile === profile.id ? "active" : ""}
                  type="button"
                  role="tab"
                  aria-selected={selectedProfile === profile.id}
                  onClick={() => setSelectedProfile(profile.id)}
                >
                  {profile.name}
                </button>
              ))}
            </div>

            <div className="profile-card">
              <div className="profile-heading">
                <div className={`profile-avatar ${previewProfile.id}`}>
                  {previewProfile.name.slice(0, 1)}
                </div>
                <div>
                  <span className="profile-accent">{previewProfile.accent}</span>
                  <h3>{previewProfile.role}</h3>
                </div>
              </div>
              <p>{previewProfile.description}</p>

              <div className="starting-numbers">
                <div>
                  <span>Tiền đầu tháng</span>
                  <strong>{formatMoney(previewProfile.cash)}</strong>
                </div>
                <div>
                  <span>Quỹ dự phòng</span>
                  <strong>{formatMoney(previewProfile.savings)}</strong>
                </div>
              </div>

              <div className="mini-stats">
                <StatBar label="Sức khỏe" value={previewProfile.health} tone="health" />
                <StatBar label="Tinh thần" value={previewProfile.morale} tone="morale" />
              </div>
            </div>

            <div className="game-promise">
              <span className="promise-number">30</span>
              <p>
                <strong>ngày để về đích</strong>
                Mỗi ngày một tình huống mới.
              </p>
              <span className="promise-mark" aria-hidden="true">
                ↗
              </span>
            </div>
          </div>
        </section>

        <footer className="intro-footer">
          <span>Dữ liệu được lưu trên thiết bị của bạn</span>
          <span>Không tiền thật · Không quảng cáo · Chỉ một chút áp lực</span>
        </footer>
      </main>
    );
  }

  if (!game || !currentEvent) return null;

  if (screen === "result") {
    const ending = getEnding(game);
    const score = getScore(game);
    const netWorth = game.cash + game.savings - game.debt;

    return (
      <main className="result-shell">
        <div className="result-paper">
          <span className="result-kicker">Báo cáo cuối tháng</span>
          <div className="result-day-stamp">
            <span>Ngày</span>
            <strong>30</strong>
          </div>
          <h1>{ending.title}</h1>
          <p className="result-copy">{ending.copy}</p>

          <div className="score-display">
            <span>Điểm tài chính</span>
            <strong>{score.toLocaleString("vi-VN")}</strong>
            <small>điểm</small>
          </div>

          <div className="result-grid">
            <div>
              <span>Tài sản ròng</span>
              <strong className={netWorth < 0 ? "danger-text" : ""}>
                {formatMoney(netWorth)}
              </strong>
            </div>
            <div>
              <span>Quỹ dự phòng</span>
              <strong>{formatMoney(game.savings)}</strong>
            </div>
            <div>
              <span>Sức khỏe</span>
              <strong>{Math.round(game.health)}/100</strong>
            </div>
            <div>
              <span>Tinh thần</span>
              <strong>{Math.round(game.morale)}/100</strong>
            </div>
          </div>

          <div className="ending-stamp">{ending.stamp}</div>

          <div className="cloud-score">
            <div className="cloud-score-copy">
              <span className="section-label">Bảng điểm cộng đồng</span>
              <h2>Đưa kết quả này lên Supabase?</h2>
              <p>
                Chỉ nhân vật và các chỉ số cuối tháng được gửi đi. Tiến trình từng
                ngày vẫn nằm trên thiết bị của bạn.
              </p>
            </div>
            <button
              className="cloud-button"
              type="button"
              onClick={saveScore}
              disabled={cloudStatus === "saving" || cloudStatus === "saved"}
            >
              {cloudStatus === "saving"
                ? "Đang lưu…"
                : cloudStatus === "saved"
                  ? "Đã lưu điểm"
                  : "Lưu điểm lên bảng xếp hạng"}
              <span aria-hidden="true">{cloudStatus === "saved" ? "✓" : "↗"}</span>
            </button>
            {cloudStatus === "error" && (
              <p className="cloud-message error" role="alert">
                Chưa thể kết nối bảng điểm. Kết quả trên thiết bị vẫn an toàn.
              </p>
            )}

            {leaderboard.length > 0 && (
              <div className="leaderboard">
                <div className="leaderboard-heading">
                  <strong>Top 5 tháng này</strong>
                  <span>Điểm</span>
                </div>
                {leaderboard.map((entry, index) => {
                  const profile = profiles.find(
                    (item) => item.id === entry.profile_id,
                  );
                  return (
                    <div className="leaderboard-row" key={entry.id}>
                      <span className="rank">{index + 1}</span>
                      <span className={`profile-avatar tiny ${entry.profile_id}`}>
                        {profile?.name.slice(0, 1) ?? "?"}
                      </span>
                      <span className="leaderboard-name">
                        <strong>{profile?.name ?? "Người chơi"}</strong>
                        <small>{profile?.role ?? "Nhân vật"}</small>
                      </span>
                      <strong className="leaderboard-score">
                        {entry.score.toLocaleString("vi-VN")}
                      </strong>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="result-actions">
            <button className="primary-button" type="button" onClick={restart}>
              Chơi lại với nhân vật khác
              <span aria-hidden="true">↻</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  const progress = ((game.day - 1) / TOTAL_DAYS) * 100;
  const netWorth = game.cash + game.savings - game.debt;

  return (
    <main className="game-shell">
      <header className="game-header">
        <button className="wordmark wordmark-button" type="button" onClick={restart}>
          <span className="wordmark-icon">₫</span>
          <span>Sống Sót</span>
        </button>
        <div className="day-counter">
          <span>Tháng này</span>
          <strong>
            Ngày {game.day}<i>/ {TOTAL_DAYS}</i>
          </strong>
        </div>
        <div className="player-chip">
          <span className={`profile-avatar small ${currentProfile.id}`}>
            {currentProfile.name.slice(0, 1)}
          </span>
          <span>
            <small>{currentProfile.role}</small>
            <strong>{currentProfile.name}</strong>
          </span>
        </div>
      </header>

      <div className="month-progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      <section className="game-layout">
        <aside className="finance-panel">
          <div className="panel-label">
            <span>Tình hình hiện tại</span>
            <span className="day-badge">Ngày {game.day}</span>
          </div>

          <div className="balance-block">
            <span>Tiền còn trong ví</span>
            <strong className={game.cash < 0 ? "danger-text" : ""}>
              {formatMoney(game.cash)}
            </strong>
            <small>
              Tài sản ròng:{" "}
              <b className={netWorth < 0 ? "danger-text" : ""}>
                {formatMoney(netWorth)}
              </b>
            </small>
          </div>

          <div className="money-grid">
            <div className="money-card savings">
              <span>Quỹ dự phòng</span>
              <strong>{formatMoney(game.savings)}</strong>
              <small>Đừng chạm nếu chưa cần</small>
            </div>
            <div className="money-card debt">
              <span>Khoản nợ</span>
              <strong>{formatMoney(game.debt)}</strong>
              <small>{game.debt === 0 ? "Sạch nợ!" : "Vẫn đang chờ xử lý"}</small>
            </div>
          </div>

          <div className="wellbeing-card">
            <span className="section-label">Không chỉ là tiền</span>
            <StatBar label="Sức khỏe" value={game.health} tone="health" />
            <StatBar label="Tinh thần" value={game.morale} tone="morale" />
          </div>

          <div className="tip-card">
            <span aria-hidden="true">✦</span>
            <p>
              <strong>Mẹo nhỏ</strong>
              Tiết kiệm hết chưa chắc đã thắng. Một tháng tốt còn cần sức khỏe và
              tinh thần.
            </p>
          </div>
        </aside>

        <section className="event-stage">
          <div className="event-meta">
            <span className="event-number">
              Tình huống {String(game.decisions + 1).padStart(2, "0")}
            </span>
            <span className="event-eyebrow">{currentEvent.eyebrow}</span>
          </div>

          <div className="event-card">
            <div className="event-card-heading">
              <span className="event-icon" aria-hidden="true">
                {currentEvent.eyebrow === "Tin vui" ||
                currentEvent.eyebrow === "Cơ hội"
                  ? "↗"
                  : "!"}
              </span>
              <div>
                <span>Ngày {game.day} · 08:30</span>
                <h1>{currentEvent.title}</h1>
              </div>
            </div>
            <p className="event-description">{currentEvent.description}</p>

            {!lastResult ? (
              <div className="choices">
                <span className="choice-label">Bạn sẽ làm gì?</span>
                {currentEvent.choices.map((choice, index) => (
                  <button
                    className="choice-button"
                    key={choice.label}
                    type="button"
                    onClick={() => choose(choice)}
                  >
                    <span className="choice-index">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="choice-copy">
                      <strong>{choice.label}</strong>
                      <small>{choice.hint}</small>
                    </span>
                    <EffectPills effects={choice.effects} />
                    <span className="choice-arrow" aria-hidden="true">
                      →
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="outcome" aria-live="polite">
                <span className="outcome-label">Quyết định đã ghi vào sổ</span>
                <h2>Mỗi lựa chọn đều để lại dấu vết.</h2>
                <p>{lastResult.result}</p>
                <EffectPills effects={lastResult.effects} />
                <button className="primary-button" type="button" onClick={nextDay}>
                  {game.day === TOTAL_DAYS ? "Xem báo cáo cuối tháng" : "Sang ngày tiếp theo"}
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            )}
          </div>

          <div className="event-footer">
            <span>
              <i className="keyboard-key">A</i>
              <i className="keyboard-key">B</i>
              Chọn điều phù hợp nhất với bạn
            </span>
            <span>Tự động lưu tiến trình</span>
          </div>
        </section>
      </section>
    </main>
  );
}
