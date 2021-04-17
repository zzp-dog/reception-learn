import VNode, { createTextVNode } from '../../vdom/vnode'
import { isFalse, isTrue, isDef, isUndef, isPrimitive } from '../../../shared/util'

// The template compiler attempts to minimize the need for normalization by
// statically analyzing the template at compile time.

// 在编译期间，模板编译器通过静态分析模板，会去尝试最小化规范化处理

// For plain HTML markup, normalization can be completely skipped because the
// generated render function is guaranteed to return Array<VNode>. There are
// two cases where extra normalization is needed:

// 对于普通的 HTML 标记，不需要规范化，因为生成的 render 函数会确保返回规范化的虚拟
// 节点数组。这里有两种情况需要额外的规范化处理：

// 1. When the children contains components - because a functional component
// may return an Array instead of a single root. In this case, just a simple
// normalization is needed - if any child is an Array, we flatten the whole
// thing with Array.prototype.concat. It is guaranteed to be only 1-level deep
// because functional components already normalize their own children.

// 当子节点包含组件时，函数化的组件的 render 可能返回虚拟节点数组（数组中的节点
// 又可能包含虚拟节点数组），而不是一个根节点。在这种情况下，我们需要将多层级的数组摊平
/**
 * 简单的摊平虚拟节点数组，保证数组只有1层深度，
 * 因为函数式组件已经规范化了它的子节点。
 * @param children 虚拟节点数组
 */
export function simpleNormalizeChildren (children: any) {
  for (let i = 0; i < children.length; i++) {
    if (Array.isArray(children[i])) {
      // Array.prototype.concat.apply([], [1,23, [1,2, [2,3]]])
      // [1, 23, 1, 2, Array(2)]
      return Array.prototype.concat.apply([], children)
    }
  }
  return children
}

// 2. When the children contains constructs that always generated nested Arrays,
// e.g. <template>, <slot>, v-for, or when the children is provided by user
// with hand-written render functions / JSX. In such cases a full normalization
// is needed to cater to all possible types of children values.

// 情景2：当子节点总是包含内嵌的数组，如 <template>, <slot> , v-for 生成的是节点数组，
// 又或是用户手写的 render 函数 / JSX ，这种情况需要递归规范化节点（注意这里并不是摊平数组，
// 只是合并了相邻文本节点，给在 v-for 循环中没有 key 的节点添加一个默认的 key）。
/**
 * 递归规范化节点
 * 注意这里并不是摊平数组，只是合并了相邻文本节点，
 * 给在 v-for 循环中没有 key 的节点添加一个默认的 key。
 * @param children 子节点
 */
export function normalizeChildren (children: any): Array<VNode> {
  return isPrimitive(children) // 是否基本类型
    ? [createTextVNode(children)] // 是基本类型创建文本节点
    : Array.isArray(children) // 不是基本类型时，判断子节点是否数组
      ? normalizeArrayChildren(children) // 是数组
      : undefined // 不是数组
}
/**
 * 是否文本节点
 * @param node 虚拟节点
 */
function isTextNode (node): boolean {
  return isDef(node) && isDef(node.text) && isFalse(node.isComment)
}
/**
 * 
 * @param children 子节点
 * @param nestedIndex 内嵌下标
 */
function normalizeArrayChildren (children: any, nestedIndex?: string): Array<VNode> {
  const res = []
  let i, c, lastIndex, last
  // 遍历节点数组
  for (i = 0; i < children.length; i++) {
    c = children[i]
    // 是布尔类型 或者 未定义
    if (isUndef(c) || typeof c === 'boolean') continue
    // 最后一个元素下标
    lastIndex = res.length - 1
    // 最后一个元素
    last = res[lastIndex]
    //  nested
    // 节点又是一个数组
    if (Array.isArray(c)) {
      // 数组非空
      if (c.length > 0) {
        // 递归调用
        c = normalizeArrayChildren(c, `${nestedIndex || ''}_${i}`)
        // merge adjacent text nodes
        // 合并相邻文本节点
        if (isTextNode(c[0]) && isTextNode(last)) {
          res[lastIndex] = createTextVNode(last.text + (c[0]as any).text)
          c.shift()
        }
        // c 是一个数组
        res.push.apply(res, c)
      }
    } else if (isPrimitive(c)) { // 基本类型
      if (isTextNode(last)) { // 最后一个节点是文本节点
        // merge adjacent text nodes
        // this is necessary for SSR hydration because text nodes are
        // essentially merged when rendered to HTML strings
        // 合并相邻节点
        res[lastIndex] = createTextVNode(last.text + c)
      } else if (c !== '') {
        // 非空白字符串
        // convert primitive to vnode
        res.push(createTextVNode(c))
      }
    } else { // 非数组也非基本类型
      if (isTextNode(c) && isTextNode(last)) {
        // merge adjacent text nodes
        // 合并相邻文本节点
        res[lastIndex] = createTextVNode(last.text + c.text)
      } else {
        // default key for nested array children (likely generated by v-for)
        // v-for 中节点如果没有 key 会自动生成一个 key
        if (isTrue(children._isVList) &&
          isDef(c.tag) &&
          isUndef(c.key) &&
          isDef(nestedIndex)) {
          c.key = `__vlist${nestedIndex}_${i}__`
        }
        res.push(c)
      }
    }
  }
  return res
}