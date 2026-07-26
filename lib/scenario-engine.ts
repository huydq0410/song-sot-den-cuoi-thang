export type ProfileId = "office" | "student" | "freelancer";

export type StatKey = "cash" | "savings" | "debt" | "health" | "morale";

export type Effects = Partial<Record<StatKey, number>>;

export type Choice = {
  label: string;
  hint: string;
  effects: Effects;
  result: string;
};

export type GameEvent = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  choices: Choice[];
};

export type ScenarioSource = "rules" | "ai";

export type ScenarioRun = {
  runId: string;
  seed: string;
  fingerprint: string;
  scenarios: GameEvent[];
  source: ScenarioSource;
  persisted: boolean;
};

type Random = () => number;

type Subject = {
  name: string;
  context: string;
  amount: number;
};

type BuildContext = {
  day: number;
  profileId: ProfileId;
  random: Random;
  subject: Subject;
  variantLine: string;
};

type ScenarioFamily = {
  id: string;
  eyebrow: string;
  subjects: Subject[];
  build: (context: BuildContext) => Omit<GameEvent, "id" | "eyebrow">;
};

const PROFILE_SCALE: Record<ProfileId, number> = {
  office: 1,
  student: 0.58,
  freelancer: 0.82,
};

const PROFILE_LABEL: Record<ProfileId, string> = {
  office: "nhân viên văn phòng",
  student: "sinh viên năm cuối",
  freelancer: "freelancer sáng tạo",
};

function hashSeed(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seed: string): Random {
  let state = hashSeed(seed) || 0x6d2b79f5;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], random: Random) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function roundMoney(value: number) {
  return Math.max(50_000, Math.round(value / 50_000) * 50_000);
}

function scaledAmount(base: number, profileId: ProfileId, random: Random) {
  const variation = 0.82 + random() * 0.38;
  return Math.max(
    10_000,
    Math.round((base * PROFILE_SCALE[profileId] * variation) / 10_000) * 10_000,
  );
}

function money(value: number) {
  return `${Math.round(value / 1_000).toLocaleString("vi-VN")} nghìn đồng`;
}

function percent(value: number, percentage: number) {
  return roundMoney(value * percentage);
}

function createChoice(
  label: string,
  hint: string,
  effects: Effects,
  result: string,
): Choice {
  return { label, hint, effects, result };
}

function createVariantLine(random: Random) {
  const hour = 7 + Math.floor(random() * 15);
  const minute = Math.floor(random() * 60);
  const second = Math.floor(random() * 60);
  const moments = [
    "giữa một ngày khá bận",
    "ngay trước lúc bạn định nghỉ",
    "sau khi kế hoạch trong ngày vừa ổn định",
    "khi bạn đang rà lại ngân sách",
    "vào một khoảng trống hiếm hoi",
    "sau một buổi làm việc dài",
    "đúng lúc bạn nghĩ hôm nay sẽ yên",
    "khi tuần mới vừa vào guồng",
  ];
  const triggers = [
    "một thông báo thứ hai xuất hiện",
    "điện thoại rung với lời nhắc mới",
    "bạn vừa kiểm tra lại số dư",
    "một cuộc gọi ngắn làm kế hoạch đổi hướng",
    "hạn xử lý bất ngờ được rút ngắn",
    "một người quen gửi thêm thông tin",
    "bạn phát hiện một chi tiết đã bỏ sót",
    "lịch cá nhân vừa có thay đổi",
  ];
  const channels = [
    "qua một tin nhắn ngắn",
    "sau một cuộc gọi bất ngờ",
    "trong email vừa nhận",
    "từ lời nhắc trên lịch",
    "qua thông báo trên điện thoại",
    "từ ghi chú bạn từng đặt",
    "sau một cuộc trò chuyện trực tiếp",
    "trên một tờ thông báo mới",
  ];
  const deadlines = [
    "và cần quyết định trước cuối ngày",
    "và chỉ còn 24 giờ để phản hồi",
    "và cần chốt trước sáng mai",
    "và không thể để qua cuối tuần",
    "và phương án tốt nhất sắp hết hạn",
    "và bạn phải trả lời trong buổi chiều",
    "và lịch xử lý vừa được đẩy sớm",
    "và hôm nay là mốc cuối để chọn",
  ];
  const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
  return `Lúc ${time}, ${pickForVariant(moments, random)}, ${pickForVariant(triggers, random)} ${pickForVariant(channels, random)} ${pickForVariant(deadlines, random)}.`;
}

function pickForVariant(items: readonly string[], random: Random) {
  return items[Math.floor(random() * items.length)];
}

const families: ScenarioFamily[] = [
  {
    id: "essential",
    eyebrow: "Khoản bắt buộc",
    subjects: [
      {
        name: "hóa đơn điện tháng nóng",
        context: "Điều hòa chạy nhiều hơn dự kiến và hạn thanh toán là tối nay.",
        amount: 1_150_000,
      },
      {
        name: "phí nhà ở phát sinh",
        context: "Chủ nhà báo thêm một khoản bảo trì chung mà bạn chưa đưa vào ngân sách.",
        amount: 2_200_000,
      },
      {
        name: "gói bảo hiểm sắp hết hạn",
        context: "Bạn phải quyết định gia hạn trước khi quyền lợi hiện tại bị ngắt.",
        amount: 1_800_000,
      },
      {
        name: "học phí hoặc lệ phí định kỳ",
        context: "Thông báo thanh toán đến sớm hơn lịch bạn đã ghi chú.",
        amount: 2_600_000,
      },
      {
        name: "cước internet và điện thoại",
        context: "Hai hóa đơn dồn cùng một ngày, trong khi công việc của bạn cần kết nối ổn định.",
        amount: 950_000,
      },
    ],
    build: ({ profileId, random, subject, variantLine }) => {
      const amount = scaledAmount(subject.amount, profileId, random);
      const firstPayment = percent(amount, 0.45);
      const debt = roundMoney(amount - firstPayment + amount * 0.08);
      return {
        title: `Đến hạn: ${subject.name}`,
        description: `${subject.context} ${variantLine} Tổng số tiền lần này là ${money(amount)}.`,
        choices: [
          createChoice(
            "Thanh toán đầy đủ",
            "Dứt điểm và giữ uy tín",
            { cash: -amount, morale: 4 },
            "Bạn đóng khoản bắt buộc đúng hạn. Số dư giảm nhưng đầu óc nhẹ đi rõ rệt.",
          ),
          createChoice(
            `Trả trước ${money(firstPayment)}`,
            "Giữ lại tiền mặt, chấp nhận phí",
            { cash: -firstPayment, debt, morale: -4 },
            "Bạn giãn được áp lực hôm nay, đổi lại là một khoản nợ phải nhớ trong những ngày tới.",
          ),
          createChoice(
            "Xin lùi hạn thanh toán",
            "Không chi ngay nhưng áp lực tăng",
            { debt: roundMoney(amount * 1.12), morale: -9 },
            "Yêu cầu được chấp nhận kèm phụ phí. Đồng hồ tài chính bắt đầu đếm ngược.",
          ),
        ],
      };
    },
  },
  {
    id: "health",
    eyebrow: "Sức khỏe",
    subjects: [
      {
        name: "cơn đau răng bất chợt",
        context: "Cơn đau chưa quá dữ dội nhưng đã làm bạn mất ngủ hai đêm.",
        amount: 1_200_000,
      },
      {
        name: "đợt cảm sốt giữa tuần",
        context: "Cơ thể đòi nghỉ trong lúc lịch làm việc vẫn còn kín.",
        amount: 750_000,
      },
      {
        name: "đau lưng vì ngồi quá lâu",
        context: "Bạn bắt đầu khó tập trung và thấy việc trì hoãn có thể khiến vấn đề nặng hơn.",
        amount: 900_000,
      },
      {
        name: "kết quả khám sức khỏe định kỳ",
        context: "Bác sĩ khuyên xử lý sớm một vấn đề nhỏ trước khi nó thành khoản chi lớn.",
        amount: 1_500_000,
      },
      {
        name: "đôi kính đã không còn đúng độ",
        context: "Mắt mỏi nhanh và hiệu suất công việc giảm thấy rõ.",
        amount: 1_050_000,
      },
    ],
    build: ({ profileId, random, subject, variantLine }) => {
      const amount = scaledAmount(subject.amount, profileId, random);
      const basic = percent(amount, 0.42);
      return {
        title: subject.name.charAt(0).toUpperCase() + subject.name.slice(1),
        description: `${subject.context} ${variantLine} Phương án điều trị đầy đủ dự kiến ${money(amount)}.`,
        choices: [
          createChoice(
            "Xử lý đầy đủ ngay",
            "Tốn tiền để hồi phục chắc chắn",
            { cash: -amount, health: 12, morale: 4 },
            "Bạn ưu tiên cơ thể và nhận lại một ngày dễ chịu hơn nhiều.",
          ),
          createChoice(
            "Chọn phương án cơ bản",
            "Chi vừa phải, hiệu quả vừa đủ",
            { cash: -basic, health: 5, morale: 1 },
            "Vấn đề được kiểm soát. Bạn vẫn cần theo dõi thêm nhưng đã tránh được kịch bản xấu.",
          ),
          createChoice(
            "Cố chịu thêm vài ngày",
            "Giữ tiền mặt, đánh đổi thể lực",
            { health: -10, morale: -6 },
            "Ví không đổi, nhưng cơ thể liên tục gửi thông báo mà bạn không thể tắt.",
          ),
        ],
      };
    },
  },
  {
    id: "mobility",
    eyebrow: "Di chuyển",
    subjects: [
      {
        name: "xe máy phát tiếng động lạ",
        context: "Thợ báo nếu sửa sớm thì chỉ cần thay một cụm linh kiện.",
        amount: 1_700_000,
      },
      {
        name: "lốp xe đã quá mòn",
        context: "Mùa mưa vừa tới và quãng đường đi mỗi ngày của bạn không hề ngắn.",
        amount: 1_050_000,
      },
      {
        name: "thẻ xe buýt sắp hết",
        context: "Gói tháng mới có ưu đãi, nhưng bạn cũng có thể mua từng lượt.",
        amount: 650_000,
      },
      {
        name: "một tuần đường chính sửa chữa",
        context: "Thời gian di chuyển có thể tăng gấp đôi nếu bạn không đổi phương án.",
        amount: 900_000,
      },
      {
        name: "chiếc xe cần bảo dưỡng",
        context: "Đèn cảnh báo đã sáng ba ngày và bạn không muốn gặp sự cố giữa đường.",
        amount: 1_350_000,
      },
    ],
    build: ({ profileId, random, subject, variantLine }) => {
      const amount = scaledAmount(subject.amount, profileId, random);
      const alternative = percent(amount, 0.28);
      return {
        title: subject.name.charAt(0).toUpperCase() + subject.name.slice(1),
        description: `${subject.context} ${variantLine} Cách xử lý triệt để tốn khoảng ${money(amount)}.`,
        choices: [
          createChoice(
            "Giải quyết triệt để",
            "Đắt hơn nhưng giảm rủi ro",
            { cash: -amount, health: 4, morale: 4 },
            "Việc di chuyển trở lại ổn định. Bạn đã mua sự an tâm bằng một khoản chi có chủ đích.",
          ),
          createChoice(
            "Dùng phương án thay thế",
            "Chậm hơn nhưng ít tốn kém",
            { cash: -alternative, health: 2, morale: -3 },
            "Lịch trình dài hơn một chút, bù lại ngân sách vẫn trong tầm kiểm soát.",
          ),
          createChoice(
            "Tiếp tục như hiện tại",
            "Không chi tiền, giữ lấy rủi ro",
            { health: -6, morale: -7 },
            "Bạn đi qua hôm nay mà không mất tiền, nhưng cảm giác bất an vẫn ngồi cùng trên xe.",
          ),
        ],
      };
    },
  },
  {
    id: "relationships",
    eyebrow: "Các mối quan hệ",
    subjects: [
      {
        name: "sinh nhật của người bạn thân",
        context: "Cả nhóm đang lên kế hoạch cho một buổi tối khá chỉn chu.",
        amount: 1_400_000,
      },
      {
        name: "gia đình cần hỗ trợ sửa chữa",
        context: "Bạn không phải gánh hết, nhưng một khoản góp sẽ giúp mọi việc nhanh hơn.",
        amount: 2_100_000,
      },
      {
        name: "đám cưới ở một tỉnh khác",
        context: "Ngoài tiền mừng còn có chi phí di chuyển và nghỉ lại.",
        amount: 2_700_000,
      },
      {
        name: "người bạn cũ hỏi vay tiền",
        context: "Họ hứa trả vào tháng sau, còn bạn thì chưa có quỹ riêng cho việc này.",
        amount: 2_000_000,
      },
      {
        name: "bữa cơm đoàn tụ bất ngờ",
        context: "Đây là dịp hiếm mọi người cùng có mặt, nhưng nhà hàng được chọn không rẻ.",
        amount: 1_250_000,
      },
    ],
    build: ({ profileId, random, subject, variantLine }) => {
      const amount = scaledAmount(subject.amount, profileId, random);
      const moderate = percent(amount, 0.38);
      return {
        title: subject.name.charAt(0).toUpperCase() + subject.name.slice(1),
        description: `${subject.context} ${variantLine} Nếu tham gia trọn vẹn, bạn sẽ chi khoảng ${money(amount)}.`,
        choices: [
          createChoice(
            "Tham gia và hỗ trợ trọn vẹn",
            "Ưu tiên tình cảm",
            { cash: -amount, morale: 12 },
            "Khoản chi không nhỏ, nhưng bạn có thêm một kỷ niệm và cảm giác mình đã có mặt đúng lúc.",
          ),
          createChoice(
            "Góp trong khả năng",
            "Giữ cả ngân sách lẫn kết nối",
            { cash: -moderate, morale: 6 },
            "Bạn đặt giới hạn rõ ràng và vẫn thể hiện sự quan tâm theo cách phù hợp.",
          ),
          createChoice(
            "Khéo léo từ chối",
            "Bảo vệ ngân sách tháng này",
            { morale: -7 },
            "Tài chính được giữ nguyên, nhưng bạn cần một cuộc trò chuyện chân thành để mọi người hiểu.",
          ),
        ],
      };
    },
  },
  {
    id: "growth",
    eyebrow: "Đầu tư bản thân",
    subjects: [
      {
        name: "khóa học đúng kỹ năng đang thiếu",
        context: "Nội dung thực tế và có dự án cuối khóa, nhưng ưu đãi chỉ còn hôm nay.",
        amount: 2_300_000,
      },
      {
        name: "kỳ thi chứng chỉ nghề nghiệp",
        context: "Chứng chỉ có thể mở thêm cơ hội thu nhập trong vài tháng tới.",
        amount: 1_800_000,
      },
      {
        name: "bộ sách chuyên môn mới",
        context: "Bạn đã đọc thử và thấy đúng vấn đề mình đang mắc.",
        amount: 850_000,
      },
      {
        name: "buổi workshop có người hướng dẫn giỏi",
        context: "Sự kiện chỉ tổ chức một lần trong quý và số chỗ còn lại không nhiều.",
        amount: 1_250_000,
      },
      {
        name: "công cụ học tập trả phí",
        context: "Gói năm rẻ hơn theo tháng nhưng đòi hỏi bạn cam kết sử dụng đều.",
        amount: 1_500_000,
      },
    ],
    build: ({ profileId, random, subject, variantLine }) => {
      const amount = scaledAmount(subject.amount, profileId, random);
      const selfStudy = percent(amount, 0.12);
      return {
        title: subject.name.charAt(0).toUpperCase() + subject.name.slice(1),
        description: `${subject.context} ${variantLine} Chi phí đầy đủ là ${money(amount)}.`,
        choices: [
          createChoice(
            "Đăng ký phương án đầy đủ",
            "Đầu tư dài hạn",
            { cash: -amount, morale: 8 },
            "Bạn biến ý định phát triển thành một cam kết có lịch trình rõ ràng.",
          ),
          createChoice(
            "Tự học với tài liệu chọn lọc",
            "Rẻ hơn, cần nhiều kỷ luật",
            { cash: -selfStudy, morale: 3, health: -1 },
            "Bạn có một lộ trình tiết kiệm hơn. Phần khó còn lại là giữ nhịp đều đặn.",
          ),
          createChoice(
            "Để sang tháng sau",
            "Không ảnh hưởng số dư hôm nay",
            { morale: -4 },
            "Ngân sách không đổi, còn cơ hội được chuyển sang danh sách chờ.",
          ),
        ],
      };
    },
  },
  {
    id: "daily",
    eyebrow: "Chi tiêu hằng ngày",
    subjects: [
      {
        name: "kế hoạch ăn trưa cả tuần",
        context: "Quán quen vừa tăng giá và bạn còn năm ngày làm việc phía trước.",
        amount: 850_000,
      },
      {
        name: "thói quen cà phê mỗi sáng",
        context: "Bạn nhận ra tháng trước mình ghé quán gần như mỗi ngày.",
        amount: 720_000,
      },
      {
        name: "giỏ hàng nhu yếu phẩm",
        context: "Một vài món tiện lợi đang làm tổng hóa đơn cao hơn dự tính.",
        amount: 1_050_000,
      },
      {
        name: "các gói đăng ký trực tuyến",
        context: "Ba dịch vụ cùng tự động gia hạn dù bạn chỉ dùng thường xuyên một gói.",
        amount: 650_000,
      },
      {
        name: "bữa tối trong tuần bận rộn",
        context: "Bạn có thể chuẩn bị trước hoặc tiếp tục đặt đồ ăn từng tối.",
        amount: 1_200_000,
      },
    ],
    build: ({ profileId, random, subject, variantLine }) => {
      const amount = scaledAmount(subject.amount, profileId, random);
      const lean = percent(amount, 0.36);
      const transfer = percent(amount, 0.22);
      return {
        title: subject.name.charAt(0).toUpperCase() + subject.name.slice(1),
        description: `${subject.context} ${variantLine} Nếu giữ nguyên thói quen, khoản chi khoảng ${money(amount)}.`,
        choices: [
          createChoice(
            "Giữ nguyên cho tiện",
            "Thoải mái hơn, chi nhiều hơn",
            { cash: -amount, morale: 6 },
            "Mọi thứ diễn ra nhanh gọn và dễ chịu, còn hóa đơn thì đúng như dự báo.",
          ),
          createChoice(
            "Chuyển sang phương án gọn",
            "Tiết kiệm mà vẫn thực tế",
            { cash: -lean, health: 3, morale: 1 },
            "Bạn cắt được phần lãng phí mà không biến cuộc sống thành một bài kiểm tra khắc nghiệt.",
          ),
          createChoice(
            "Cắt mạnh và để dành phần chênh",
            "Hiệu quả cao, hơi thiếu thoải mái",
            { cash: -transfer, savings: transfer, morale: -5 },
            "Quỹ dự phòng dày thêm một chút, đổi lại là vài ngày cần nhiều kỷ luật.",
          ),
        ],
      };
    },
  },
  {
    id: "work",
    eyebrow: "Công việc",
    subjects: [
      {
        name: "máy tính bắt đầu chậm",
        context: "Mỗi tác vụ mất thêm vài phút và sự kiên nhẫn đang cạn dần.",
        amount: 3_500_000,
      },
      {
        name: "phần mềm làm việc cần gia hạn",
        context: "Bản miễn phí vẫn dùng được nhưng thiếu đúng tính năng bạn cần nhất.",
        amount: 1_650_000,
      },
      {
        name: "góc làm việc gây mỏi vai",
        context: "Một chiếc ghế tốt hơn có thể giúp bạn làm việc bền hơn mỗi ngày.",
        amount: 2_400_000,
      },
      {
        name: "ổ cứng gần đầy",
        context: "Các tệp quan trọng chưa có bản sao và máy liên tục cảnh báo.",
        amount: 1_450_000,
      },
      {
        name: "lời mời nhận thêm dự án",
        context: "Thù lao hấp dẫn nhưng tiến độ sẽ chiếm gần hết hai cuối tuần.",
        amount: 2_800_000,
      },
    ],
    build: ({ profileId, random, subject, variantLine }) => {
      const amount = scaledAmount(subject.amount, profileId, random);
      const workaround = percent(amount, 0.16);
      const income = roundMoney(amount * (0.7 + random() * 0.45));
      const isProject = subject.name.includes("dự án");
      return {
        title: subject.name.charAt(0).toUpperCase() + subject.name.slice(1),
        description: isProject
          ? `${subject.context} ${variantLine} Khoản thu thêm có thể đạt ${money(income)}.`
          : `${subject.context} ${variantLine} Phương án nâng cấp phù hợp tốn khoảng ${money(amount)}.`,
        choices: isProject
          ? [
              createChoice(
                "Nhận toàn bộ dự án",
                "Thêm tiền, ít thời gian hồi phục",
                { cash: income, health: -10, morale: -5 },
                "Tài khoản tăng đáng kể, còn lịch nghỉ gần như biến mất.",
              ),
              createChoice(
                "Chỉ nhận một phần",
                "Cân bằng thu nhập và sức lực",
                { cash: percent(income, 0.48), health: -3, morale: 2 },
                "Bạn có thêm thu nhập mà vẫn giữ được một khoảng thở cần thiết.",
              ),
              createChoice(
                "Từ chối để nghỉ",
                "Không thêm tiền, bảo vệ năng lượng",
                { health: 7, morale: 5 },
                "Bạn bỏ qua khoản thu ngắn hạn và lấy lại một cuối tuần thật sự.",
              ),
            ]
          : [
              createChoice(
                "Nâng cấp ngay",
                "Hiệu suất đổi bằng tiền",
                { cash: -amount, morale: 9, health: 3 },
                "Công việc trơn tru trở lại và khoản chi có lý do rất rõ ràng.",
              ),
              createChoice(
                "Dùng giải pháp tạm thời",
                "Tốn công, ít tốn tiền",
                { cash: -workaround, health: -2, morale: 2 },
                "Bạn kéo dài được tuổi thọ công cụ, dù vẫn phải kiên nhẫn hơn mỗi ngày.",
              ),
              createChoice(
                "Chưa làm gì",
                "Giữ tiền nhưng giảm hiệu suất",
                { health: -4, morale: -7 },
                "Số dư đứng yên trong khi những phút chờ đợi tiếp tục cộng lại.",
              ),
            ],
      };
    },
  },
  {
    id: "temptation",
    eyebrow: "Lời mời hấp dẫn",
    subjects: [
      {
        name: "đợt giảm giá món đồ công nghệ",
        context: "Món đồ nằm trong danh sách mong muốn đã lâu nhưng chưa thực sự cấp thiết.",
        amount: 3_200_000,
      },
      {
        name: "kèo đầu tư lợi nhuận cao",
        context: "Người quen khẳng định cơ hội này gần như không thể thua.",
        amount: 2_500_000,
      },
      {
        name: "chuyến đi cuối tuần chớp nhoáng",
        context: "Nhóm bạn đã chốt lịch và đang chờ câu trả lời của bạn.",
        amount: 2_800_000,
      },
      {
        name: "vé sự kiện số lượng giới hạn",
        context: "Đây là trải nghiệm bạn rất thích, nhưng nó không có trong kế hoạch tháng.",
        amount: 1_900_000,
      },
      {
        name: "gói mua trước giá hời",
        context: "Giá mỗi lần dùng rất rẻ nếu bạn thanh toán cả năm ngay hôm nay.",
        amount: 2_100_000,
      },
    ],
    build: ({ profileId, random, subject, variantLine }) => {
      const amount = scaledAmount(subject.amount, profileId, random);
      const smallTry = percent(amount, 0.32);
      const transfer = percent(amount, 0.18);
      return {
        title: subject.name.charAt(0).toUpperCase() + subject.name.slice(1),
        description: `${subject.context} ${variantLine} Giá để tham gia trọn vẹn là ${money(amount)}.`,
        choices: [
          createChoice(
            "Xuống tiền trọn vẹn",
            "Niềm vui lớn, ngân sách rung chuyển",
            { cash: -amount, morale: 12 },
            "Bạn có điều mình muốn ngay lập tức, cùng một khoảng trống khá rõ trong ngân sách.",
          ),
          createChoice(
            "Thử ở mức nhỏ",
            "Giới hạn rủi ro",
            { cash: -smallTry, morale: 5 },
            "Bạn thỏa được một phần tò mò mà không đặt cả tháng vào một quyết định.",
          ),
          createChoice(
            "Bỏ qua và chuyển tiền sang quỹ",
            "Biến cám dỗ thành lớp đệm",
            { cash: -transfer, savings: transfer, morale: 2 },
            "Cảm giác tiếc nuối qua nhanh hơn bạn nghĩ khi nhìn quỹ dự phòng tăng lên.",
          ),
        ],
      };
    },
  },
  {
    id: "recovery",
    eyebrow: "Khoảng thở",
    subjects: [
      {
        name: "một ngày hoàn toàn trống lịch",
        context: "Bạn hiếm khi có một khoảng thời gian không bị ai đặt trước.",
        amount: 700_000,
      },
      {
        name: "cuối tuần sau chuỗi ngày tăng ca",
        context: "Cả cơ thể lẫn tinh thần đều báo rằng nhịp vừa qua không thể kéo dài.",
        amount: 950_000,
      },
      {
        name: "lời rủ đi xem phim và ăn tối",
        context: "Một buổi đổi không khí nghe rất hợp lúc này.",
        amount: 800_000,
      },
      {
        name: "căn phòng cần được dọn lại",
        context: "Bạn có thể tự làm, thuê người hỗ trợ hoặc tiếp tục sống cùng sự bừa bộn.",
        amount: 650_000,
      },
      {
        name: "cơ hội làm thêm trong ngày nghỉ",
        context: "Khoản thu không tệ nhưng đây cũng là ngày nghỉ duy nhất của tuần.",
        amount: 1_100_000,
      },
    ],
    build: ({ profileId, random, subject, variantLine }) => {
      const amount = scaledAmount(subject.amount, profileId, random);
      const simple = percent(amount, 0.2);
      const extraIncome = roundMoney(amount * (0.85 + random() * 0.5));
      return {
        title: subject.name.charAt(0).toUpperCase() + subject.name.slice(1),
        description: `${subject.context} ${variantLine} Một ngày thoải mái theo kế hoạch sẽ tốn khoảng ${money(amount)}.`,
        choices: [
          createChoice(
            "Tận hưởng trọn vẹn",
            "Chi cho một lần hồi phục",
            { cash: -amount, health: 7, morale: 12 },
            "Bạn quay lại nhịp sống với nhiều năng lượng hơn và một khoản chi không hề vô nghĩa.",
          ),
          createChoice(
            "Nghỉ theo cách đơn giản",
            "Hồi phục gần như miễn phí",
            { cash: -simple, health: 6, morale: 6 },
            "Một bữa ăn gọn, giấc ngủ đủ và chiếc điện thoại để xa đã tạo khác biệt lớn.",
          ),
          createChoice(
            "Biến thời gian thành thu nhập",
            "Thêm tiền, bớt năng lượng",
            { cash: extraIncome, health: -7, morale: -5 },
            "Ngày trống trở thành một ngày làm việc hiệu quả, nhưng cơ thể vẫn chưa được nghỉ.",
          ),
        ],
      };
    },
  },
  {
    id: "windfall",
    eyebrow: "Tin vui",
    subjects: [
      {
        name: "khoản hoàn tiền bị quên",
        context: "Ví điện tử báo một giao dịch hoàn tiền từ chương trình cũ.",
        amount: 750_000,
      },
      {
        name: "món đồ cũ bất ngờ bán được",
        context: "Một người mua chấp nhận đúng mức giá bạn đã đăng từ lâu.",
        amount: 1_600_000,
      },
      {
        name: "thưởng hiệu suất nhỏ",
        context: "Khoản tiền đến ngoài dự tính và chưa có nhiệm vụ nào.",
        amount: 1_900_000,
      },
      {
        name: "dự án cũ thanh toán phần còn lại",
        context: "Bạn từng nghĩ sẽ phải chờ sang tháng sau mới nhận được.",
        amount: 2_400_000,
      },
      {
        name: "hóa đơn được điều chỉnh giảm",
        context: "Nhà cung cấp xác nhận đã tính thừa và trả lại phần chênh lệch.",
        amount: 950_000,
      },
    ],
    build: ({ profileId, random, subject, variantLine }) => {
      const amount = scaledAmount(subject.amount, profileId, random);
      const half = percent(amount, 0.5);
      return {
        title: subject.name.charAt(0).toUpperCase() + subject.name.slice(1),
        description: `${subject.context} ${variantLine} Bạn vừa có thêm ${money(amount)} ngoài kế hoạch.`,
        choices: [
          createChoice(
            "Đưa hết vào quỹ dự phòng",
            "Tương lai cảm ơn bạn",
            { savings: amount, morale: 3 },
            "Khoản tiền bất ngờ lập tức nhận một nhiệm vụ dài hạn và quỹ an toàn dày hơn.",
          ),
          createChoice(
            "Dùng để giảm nợ",
            "Bớt gánh nặng phía trước",
            { debt: -amount, morale: 6 },
            "Con số nợ nhỏ lại. Đây là niềm vui không ồn ào nhưng kéo dài.",
          ),
          createChoice(
            "Chia đôi để dành và tận hưởng",
            "Cân bằng hiện tại với tương lai",
            { cash: half, savings: amount - half, morale: 8 },
            "Bạn có một phần để vui hôm nay và một phần bảo vệ những ngày chưa tới.",
          ),
        ],
      };
    },
  },
];

function createSchedule(random: Random) {
  const schedule: ScenarioFamily[] = [];
  for (let round = 0; round < 3; round += 1) {
    const shuffled = shuffle(families, random);
    if (
      schedule.length > 0 &&
      shuffled[0]?.id === schedule[schedule.length - 1]?.id
    ) {
      [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    }
    schedule.push(...shuffled);
  }
  return schedule;
}

export function isProfileId(value: unknown): value is ProfileId {
  return value === "office" || value === "student" || value === "freelancer";
}

export function generateScenarioDeck(profileId: ProfileId, seed: string) {
  const random = createRandom(`${seed}:${profileId}`);
  const schedule = createSchedule(random);
  const subjectsByFamily = new Map(
    families.map((family) => [family.id, shuffle(family.subjects, random)]),
  );
  const useCount = new Map<string, number>();

  return schedule.map((family, index): GameEvent => {
    const used = useCount.get(family.id) ?? 0;
    useCount.set(family.id, used + 1);
    const subjects = subjectsByFamily.get(family.id) ?? family.subjects;
    const subject = subjects[used % subjects.length];
    const built = family.build({
      day: index + 1,
      profileId,
      random,
      subject,
      variantLine: createVariantLine(random),
    });

    return {
      id: `${family.id}-${hashSeed(`${seed}:${index}:${subject.name}`).toString(36)}`,
      eyebrow: family.eyebrow,
      ...built,
    };
  });
}

export function scenarioLogicFingerprintPayload(scenario: GameEvent) {
  return JSON.stringify({
    eyebrow: scenario.eyebrow,
    title: scenario.title,
    description: scenario.description,
    choices: scenario.choices.map((choice) => ({
      effects: choice.effects,
    })),
  });
}

export function scenarioFingerprintPayload(
  profileId: ProfileId,
  scenarios: GameEvent[],
) {
  return JSON.stringify({
    profileId,
    scenarios: scenarios.map((scenario) =>
      JSON.parse(scenarioLogicFingerprintPayload(scenario)),
    ),
  });
}

export function getProfilePromptLabel(profileId: ProfileId) {
  return PROFILE_LABEL[profileId];
}
