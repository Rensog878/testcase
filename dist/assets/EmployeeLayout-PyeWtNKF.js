import{c as s,r as l,a as i,j as e,N as n,i as r,O as c}from"./index-DnO7mTO9.js";import{S as p,M as d}from"./Sidebar-BRjmGS2e.js";import{B as m}from"./bell-ehWSf7MA.js";import{L as h}from"./layout-dashboard-CC9AWFf5.js";import{U as y}from"./user-round-Bn8g2i_j.js";/**
 * @license lucide-react v0.446.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=s("Boxes",[["path",{d:"M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z",key:"lc1i9w"}],["path",{d:"m7 16.5-4.74-2.85",key:"1o9zyk"}],["path",{d:"m7 16.5 5-3",key:"va8pkn"}],["path",{d:"M7 16.5v5.17",key:"jnp8gn"}],["path",{d:"M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z",key:"8zsnat"}],["path",{d:"m17 16.5-5-3",key:"8arw3v"}],["path",{d:"m17 16.5 4.74-2.85",key:"8rfmw"}],["path",{d:"M17 16.5v5.17",key:"k6z78m"}],["path",{d:"M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z",key:"1xygjf"}],["path",{d:"M12 8 7.26 5.15",key:"1vbdud"}],["path",{d:"m12 8 4.74-2.85",key:"3rx089"}],["path",{d:"M12 13.5V8",key:"1io7kd"}]]);/**
 * @license lucide-react v0.446.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=s("ChartPie",[["path",{d:"M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z",key:"pzmjnu"}],["path",{d:"M21.21 15.89A10 10 0 1 1 8 2.83",key:"k2fpak"}]]);/**
 * @license lucide-react v0.446.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=s("ContactRound",[["path",{d:"M16 2v2",key:"scm5qe"}],["path",{d:"M17.915 22a6 6 0 0 0-12 0",key:"suqz9p"}],["path",{d:"M8 2v2",key:"pbkmx"}],["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["rect",{x:"3",y:"4",width:"18",height:"18",rx:"2",key:"12vinp"}]]);/**
 * @license lucide-react v0.446.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=s("Send",[["path",{d:"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",key:"1ffxy3"}],["path",{d:"m21.854 2.147-10.94 10.939",key:"12cjpa"}]]);/**
 * @license lucide-react v0.446.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b=s("SquareCheckBig",[["path",{d:"M21 10.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.5",key:"1uzm8b"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]]);/**
 * @license lucide-react v0.446.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=s("Square",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}]]),M=[{title:"Workspace",links:[{to:"/employee",end:!0,icon:e.jsx(h,{size:16}),label:"Dashboard"},{to:"/employee",icon:e.jsx(x,{size:16}),label:"Inventory & Stock"},{to:"/employee",icon:e.jsx(u,{size:16}),label:"Orders & Dispatch"},{to:"/employee",icon:e.jsx(j,{size:16}),label:"Customer CRM"},{to:"/employee/tickets",icon:e.jsx(v,{size:16}),label:"Support Tickets",badge:"new"}]},{title:"My Account",links:[{to:"/employee",icon:e.jsx(b,{size:16}),label:"Tasks & Approvals"},{to:"/employee",icon:e.jsx(k,{size:16}),label:"Reports"},{to:"/employee/profile",icon:e.jsx(y,{size:16}),label:"My Profile"}]}];function C(){const[o,t]=l.useState(!1),{user:a}=i();return e.jsxs("div",{className:"app-layout",children:[e.jsx(p,{items:M,roleName:"Employee",roleIcon:n,isOpen:o,onClose:()=>t(!1)}),e.jsxs("div",{className:"main-content employee-workspace",children:[e.jsxs("header",{className:"topbar",children:[e.jsxs("div",{className:"topbar-left",children:[e.jsx("button",{className:"hamburger-btn",onClick:()=>t(!0),"aria-label":"Open navigation menu",children:e.jsx(d,{size:20})}),e.jsxs("div",{children:[e.jsx("div",{className:"topbar-title",children:"Employee ERP Portal"}),e.jsx("div",{className:"topbar-subtitle",children:a!=null&&a.storeName?`Store: ${a.storeName} · ERP & Tasks`:"Inventory, Stock & Task Management"})]})]}),e.jsxs("div",{className:"topbar-right employee-header-actions",children:[e.jsx("button",{className:"employee-icon-button",title:"Search workspace",children:e.jsx(r,{size:18})}),e.jsxs("button",{className:"employee-icon-button employee-notification",title:"Notifications",children:[e.jsx(m,{size:18}),e.jsx("span",{children:"3"})]}),e.jsxs("span",{className:"employee-user-chip",children:[e.jsx("span",{className:"employee-avatar",children:"MK"}),e.jsxs("span",{children:[e.jsx("strong",{children:(a==null?void 0:a.name)||"Muthuvel K"}),e.jsx("small",{children:"Operations"})]})]})]})]}),e.jsx("main",{className:"page-content",children:e.jsx(c,{})})]})]})}export{C as default};
