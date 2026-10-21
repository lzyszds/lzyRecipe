import { PageHeader } from '../components/ui/PageHeader';

export function Help() {
  const sections = [
    {
      title: '浏览菜谱',
      content:
        '首页可查看今日三餐、分类入口和精选菜谱；底部「分类」页可浏览全部菜谱，搜索栏支持按菜名、分类和食材搜索。',
    },
    {
      title: '写菜谱',
      content:
        '点击首页右上角的「+」新建菜谱。名称、分类、时长、食材和步骤填写完成后即可保存；封面可搜索或手动选择，未选择时会自动生成。',
    },
    {
      title: '导入菜谱',
      content:
        '点击首页右上角的导入按钮，可从文件或粘贴 JSON 数据导入，系统会自动校验格式并按 id 去重。',
    },
    {
      title: '收藏与周计划',
      content:
        '在菜谱卡片或详情页点击爱心收藏。底部「周计划」可按天安排早午晚三餐，支持智能填充、收藏方案、采购清单和分享图片。',
    },
    {
      title: '封面来源',
      content:
        '默认使用免配置的百度图片搜索与内置封面；如需 AI 生图，可在「我的 → 设置」中配置百度文心或 Bing 密钥。',
    },
    {
      title: '反馈',
      content:
        '如有问题或建议，欢迎通过项目仓库的 GitHub Issues 或邮件反馈。',
    },
  ];

  return (
    <div>
      <PageHeader title="帮助与反馈" showBack />

      <main className="page-main space-y-3">
        {sections.map((section) => (
          <section key={section.title} className="bg-white rounded-xl p-5 shadow-card">
            <h2 className="text-sm font-bold text-text-primary mb-2">{section.title}</h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              {section.content}
            </p>
          </section>
        ))}
      </main>
    </div>
  );
}
