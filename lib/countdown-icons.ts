import {
  Award,
  Baby,
  Briefcase,
  Cake,
  Calendar,
  Clover,
  Coffee,
  Gift,
  GraduationCap,
  Heart,
  Home,
  Luggage,
  Music,
  PartyPopper,
  Plane,
  Sprout,
  Star,
  Tag,
  Users,
  type LucideIcon,
} from 'lucide-react'

/** 图标注册表：条目 / 分类都从这里选取图标，key 落库，方便以后扩充或换库 */
export const ICON_OPTIONS: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: 'cake', label: '生日', Icon: Cake },
  { key: 'party', label: '庆祝', Icon: PartyPopper },
  { key: 'gift', label: '礼物', Icon: Gift },
  { key: 'heart', label: '纪念', Icon: Heart },
  { key: 'star', label: '重要', Icon: Star },
  { key: 'award', label: '成就', Icon: Award },
  { key: 'briefcase', label: '工作', Icon: Briefcase },
  { key: 'graduation', label: '学业', Icon: GraduationCap },
  { key: 'plane', label: '出行', Icon: Plane },
  { key: 'luggage', label: '旅行', Icon: Luggage },
  { key: 'home', label: '居家', Icon: Home },
  { key: 'users', label: '聚会', Icon: Users },
  { key: 'baby', label: '家庭', Icon: Baby },
  { key: 'sprout', label: '成长', Icon: Sprout },
  { key: 'clover', label: '祝福', Icon: Clover },
  { key: 'coffee', label: '日常', Icon: Coffee },
  { key: 'music', label: '娱乐', Icon: Music },
  { key: 'calendar', label: '日期', Icon: Calendar },
  { key: 'tag', label: '默认', Icon: Tag },
]

export const DEFAULT_CATEGORY_ICONS: Record<string, string> = {
  生活: 'coffee',
  工作: 'briefcase',
  纪念日: 'heart',
  节日: 'party',
  其他: 'tag',
}

export const FALLBACK_ICON_KEY = 'tag'

export function getIcon(key?: string) {
  return ICON_OPTIONS.find((option) => option.key === key)?.Icon ?? Tag
}
