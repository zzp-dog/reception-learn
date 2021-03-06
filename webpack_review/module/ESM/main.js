// ./main.js

// 星号别名导出，导出的是整个的模块（ Module 的实例）
import * as obj from './test.js';
console.log(obj);

// 解构导入，这里从 Module 实例中解构 a
import {a, b} from './test.js'
console.log(a); // {a: 1}
console.log(b); // {b: 2}

// 导入默认，xxx 不是关键字就行了
// 前提是被导入模块必须有 default 默认导出
import xxx from './test.js';
console.log(xxx); // {desc: "我是默认导出"}