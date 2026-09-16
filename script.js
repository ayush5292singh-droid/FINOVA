/* =========================================================
   FINANCE MANAGER
   MAX WEB EDITION
   ========================================================= */

const KEY="finance_manager_max_v1";

let data=JSON.parse(localStorage.getItem(KEY)) || {
 transactions:[],
 budgets:[],
 goals:[],
 recurring:[],
 accounts:[
   {id:1,name:"Cash",balance:0,type:"Cash"}
 ],
 premium:false,
 theme:"dark"
};

let currentFilter="all";
let overviewChart=null;
let categoryChart=null;

const categories=[
 "Food","Shopping","Transport","Bills","Entertainment",
 "Education","Health","Travel","Salary","Investment","Other"
];

function save(){
 localStorage.setItem(KEY,JSON.stringify(data));
 updateAll();
}

function money(n){
 return "₹"+Number(n||0).toLocaleString("en-IN",{
 maximumFractionDigits:2
 });
}

function today(){
 return new Date().toISOString().slice(0,10);
}

function showToast(text){
 const t=document.getElementById("toast");
 t.textContent=text;
 t.classList.add("show");
 setTimeout(()=>t.classList.remove("show"),2200);
}

function showPage(page){
 document.querySelectorAll(".page").forEach(x=>x.classList.remove("active-page"));
 document.getElementById(page).classList.add("active-page");

 document.querySelectorAll(".nav").forEach(x=>{
   x.classList.toggle("active",x.dataset.page===page);
 });
 window.scrollTo({top:0,behavior:"smooth"});
}

document.querySelectorAll(".nav").forEach(btn=>{
 btn.onclick=()=>showPage(btn.dataset.page);
});

function toggleTheme(){
 data.theme=data.theme==="dark"?"light":"dark";
 document.body.classList.toggle("light",data.theme==="light");
 save();
}

function totals(){
 let income=0,expense=0;

 data.transactions.forEach(t=>{
   if(t.type==="income") income+=Number(t.amount);
   if(t.type==="expense") expense+=Number(t.amount);
 });

 return {
   income,
   expense,
   balance:income-expense
 };
}

function updateDashboard(){
 const t=totals();

 document.getElementById("balance").textContent=money(t.balance);
 document.getElementById("income").textContent=money(t.income);
 document.getElementById("expense").textContent=money(t.expense);

 const rate=t.income ? Math.round((t.balance/t.income)*100):0;

 document.getElementById("savingRate").textContent=rate+"%";
 document.getElementById("transactionCount").textContent=data.transactions.length;

 document.getElementById("monthName").textContent=
 new Date().toLocaleString("en-IN",{month:"long",year:"numeric"});

 renderRecent();
 renderUpcoming();
}

function renderRecent(){
 const box=document.getElementById("recentList");

 const arr=[...data.transactions]
 .sort((a,b)=>b.created-a.created)
 .slice(0,5);

 if(!arr.length){
   box.innerHTML=`<div class="empty">No transactions yet.<br>Add your first income or expense.</div>`;
   return;
 }

 box.innerHTML=arr.map(transactionHTML).join("");
}

function transactionHTML(t){
 return `
 <div class="transaction">
   <div class="tx-icon">${t.type==="income"?"↑":"↓"}</div>

   <div class="tx-info">
     <strong>${escapeHTML(t.title)}</strong>
     <small>${escapeHTML(t.category||"Other")} • ${t.date}</small>
   </div>

   <div class="amount ${t.type}">
     ${t.type==="income"?"+":"-"}${money(t.amount)}
   </div>
 </div>
 `;
}

function renderUpcoming(){
 const box=document.getElementById("upcomingList");

 const arr=data.recurring
 .filter(x=>x.nextDate)
 .sort((a,b)=>a.nextDate.localeCompare(b.nextDate))
 .slice(0,4);

 if(!arr.length){
   box.innerHTML=`<div class="empty">No recurring payments.</div>`;
   return;
 }

 box.innerHTML=arr.map(x=>`
 <div class="transaction">
   <div class="tx-icon">↻</div>
   <div class="tx-info">
     <strong>${escapeHTML(x.name)}</strong>
     <small>${x.nextDate} • ${escapeHTML(x.category||"Payment")}</small>
   </div>
   <div class="amount expense">-${money(x.amount)}</div>
 </div>
 `).join("");
}

function openTransaction(type="expense"){
 document.getElementById("modalContent").innerHTML=`
 <h2>Add ${type==="income"?"Income":"Expense"}</h2>

 <div class="form">

 <label>Title</label>
 <input id="txTitle" placeholder="e.g. Grocery shopping">

 <label>Amount</label>
 <input id="txAmount" type="number" min="0" placeholder="0">

 <label>Category</label>
 <select id="txCategory">
 ${categories.map(c=>`<option>${c}</option>`).join("")}
 </select>

 <label>Date</label>
 <input id="txDate" type="date" value="${today()}">

 <label>Account</label>
 <select id="txAccount">
 ${data.accounts.map(a=>`<option>${escapeHTML(a.name)}</option>`).join("")}
 </select>

 <label>Notes</label>
 <input id="txNotes" placeholder="Optional note">

 <button onclick="addTransaction('${type}')">SAVE TRANSACTION</button>

 </div>
 `;

 openModal();
}

function addTransaction(type){
 const title=document.getElementById("txTitle").value.trim();
 const amount=Number(document.getElementById("txAmount").value);

 if(!title || amount<=0){
   showToast("Enter a title and valid amount");
   return;
 }

 data.transactions.push({
   id:Date.now(),
   created:Date.now(),
   title,
   amount,
   category:document.getElementById("txCategory").value,
   date:document.getElementById("txDate").value,
   account:document.getElementById("txAccount").value,
   notes:document.getElementById("txNotes").value,
   type
 });

 closeModal();
 save();
 showToast("Transaction saved");
}

function renderTransactions(){
 const box=document.getElementById("transactionList");
 const search=(document.getElementById("searchBox")?.value||"").toLowerCase();

 let arr=[...data.transactions].sort((a,b)=>b.created-a.created);

 if(currentFilter!=="all"){
   arr=arr.filter(x=>x.type===currentFilter);
 }

 if(search){
   arr=arr.filter(x=>
     x.title.toLowerCase().includes(search) ||
     (x.category||"").toLowerCase().includes(search) ||
     (x.notes||"").toLowerCase().includes(search)
   );
 }

 if(!arr.length){
   box.innerHTML=`<div class="empty">No matching transactions.</div>`;
   return;
 }

 box.innerHTML=arr.map(t=>`
 <div class="transaction">
   <div class="tx-icon">${t.type==="income"?"↑":"↓"}</div>
   <div class="tx-info">
     <strong>${escapeHTML(t.title)}</strong>
     <small>${escapeHTML(t.category)} • ${t.date} • ${escapeHTML(t.account||"")}</small>
   </div>
   <div>
     <div class="amount ${t.type}">
       ${t.type==="income"?"+":"-"}${money(t.amount)}
     </div>
     <button onclick="deleteTransaction(${t.id})"
     style="background:none;color:#ff5c72;font-size:10px;margin-top:5px">
     DELETE
     </button>
   </div>
 </div>
 `).join("");
}

function setFilter(filter,el){
 currentFilter=filter;

 document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));
 el.classList.add("active");

 renderTransactions();
}

function deleteTransaction(id){
 if(!confirm("Delete this transaction?")) return;

 data.transactions=data.transactions.filter(x=>x.id!==id);
 save();
 showToast("Transaction deleted");
}

function openBudget(){
 document.getElementById("modalContent").innerHTML=`
 <h2>Create budget</h2>
 <div class="form">

 <label>Category</label>
 <select id="budgetCategory">
 ${categories.filter(x=>x!=="Salary").map(c=>`<option>${c}</option>`).join("")}
 </select>

 <label>Monthly limit</label>
 <input id="budgetAmount" type="number" placeholder="₹">

 <button onclick="addBudget()">CREATE BUDGET</button>
 </div>
 `;
 openModal();
}

function addBudget(){
 const category=document.getElementById("budgetCategory").value;
 const amount=Number(document.getElementById("budgetAmount").value);

 if(amount<=0)return showToast("Enter a valid limit");

 data.budgets.push({
   id:Date.now(),
   category,
   amount
 });

 closeModal();
 save();
 showToast("Budget created");
}

function renderBudgets(){
 const box=document.getElementById("budgetList");

 if(!data.budgets.length){
   box.innerHTML=`<div class="empty">Create your first budget.</div>`;
 }else{
   box.innerHTML=data.budgets.map(b=>{
     const spent=data.transactions
       .filter(t=>t.type==="expense"&&t.category===b.category)
       .reduce((s,t)=>s+Number(t.amount),0);

     const pct=Math.min(100,Math.round(spent/b.amount*100));

     return `
     <div class="card">
       <div class="budget-head">
         <strong>${escapeHTML(b.category)}</strong>
         <span>${money(spent)} / ${money(b.amount)}</span>
       </div>

       <div class="progress">
         <div style="width:${pct}%"></div>
       </div>

       <small class="${pct>=100?"expense":""}">
         ${pct}% used
       </small>

       <button onclick="deleteBudget(${b.id})"
       style="background:none;color:#ff5c72;float:right;font-size:10px">
       DELETE
       </button>
     </div>
     `;
   }).join("");
 }
}

function deleteBudget(id){
 data.budgets=data.budgets.filter(x=>x.id!==id);
 save();
}

function openGoal(){
 document.getElementById("modalContent").innerHTML=`
 <h2>New savings goal</h2>
 <div class="form">

 <label>Goal name</label>
 <input id="goalName" placeholder="New laptop">

 <label>Target amount</label>
 <input id="goalTarget" type="number" placeholder="₹">

 <label>Already saved</label>
 <input id="goalSaved" type="number" placeholder="₹0">

 <button onclick="addGoal()">CREATE GOAL</button>
 </div>
 `;
 openModal();
}

function addGoal(){
 const name=document.getElementById("goalName").value.trim();
 const target=Number(document.getElementById("goalTarget").value);
 const saved=Number(document.getElementById("goalSaved").value)||0;

 if(!name||target<=0)return showToast("Enter valid goal details");

 data.goals.push({
   id:Date.now(),
   name,
   target,
   saved
 });

 closeModal();
 save();
 showToast("Savings goal created");
}

function renderGoals(){
 const box=document.getElementById("goalList");

 if(!data.goals.length){
   box.innerHTML=`<div class="empty">Create a savings goal.</div>`;
   return;
 }

 box.innerHTML=data.goals.map(g=>{
   const pct=Math.min(100,Math.round(g.saved/g.target*100));

   return `
   <div class="goal">
    <div class="budget-head">
      <strong>🎯 ${escapeHTML(g.name)}</strong>
      <span>${pct}%</span>
    </div>

    <div class="progress">
      <div style="width:${pct}%"></div>
    </div>

    <small>${money(g.saved)} saved of ${money(g.target)}</small>

    <button onclick="addGoalMoney(${g.id})"
    style="float:right;background:none;color:#16d9ff;font-size:11px">
    + ADD
    </button>
   </div>
   `;
 }).join("");
}

function addGoalMoney(id){
 const amount=Number(prompt("How much did you save?"));

 if(!amount||amount<=0)return;

 const g=data.goals.find(x=>x.id===id);

 if(g){
   g.saved+=amount;
   save();
   showToast("Goal updated");
 }
}

function updateCharts(){
 const t=totals();

 const ctx=document.getElementById("overviewChart");

 if(overviewChart) overviewChart.destroy();

 overviewChart=new Chart(ctx,{
   type:"doughnut",
   data:{
     labels:["Income","Expenses","Savings"],
     datasets:[{
       data:[
         t.income,
         t.expense,
         Math.max(0,t.balance)
       ]
     }]
   },
   options:{
     responsive:true,
     maintainAspectRatio:false,
     plugins:{
       legend:{
         labels:{color:getComputedStyle(document.body).color}
       }
     }
   }
 });

 const categoryTotals={};

 data.transactions
 .filter(x=>x.type==="expense")
 .forEach(x=>{
   categoryTotals[x.category]=(categoryTotals[x.category]||0)+Number(x.amount);
 });

 const labels=Object.keys(categoryTotals);
 const values=Object.values(categoryTotals);

 const cc=document.getElementById("categoryChart");

 if(categoryChart)categoryChart.destroy();

 categoryChart=new Chart(cc,{
   type:"bar",
   data:{
     labels,
     datasets:[{
       label:"Spending",
       data:values
     }]
   },
   options:{
     responsive:true,
     maintainAspectRatio:false,
     scales:{
       x:{ticks:{color:getComputedStyle(document.body).color}},
       y:{ticks:{color:getComputedStyle(document.body).color}}
     }
   }
 });
}

function generateInsights(){
 const box=document.getElementById("smartInsights");
 const t=totals();

 let insights=[];

 if(!data.transactions.length){
   insights.push("Add transactions to unlock personalized financial insights.");
 }else{

   if(t.income>0){
     const rate=t.balance/t.income*100;

     if(rate>=30)
       insights.push("Your current savings rate is above 30%.");

     if(rate<10)
       insights.push("Your current savings rate is below 10%.");
   }

   const cats={};

   data.transactions
   .filter(x=>x.type==="expense")
   .forEach(x=>cats[x.category]=(cats[x.category]||0)+Number(x.amount));

   const top=Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];

   if(top){
     insights.push(`Your largest expense category is ${top[0]} at ${money(top[1])}.`);
   }

   if(data.budgets.length){
     data.budgets.forEach(b=>{
       const spent=data.transactions
       .filter(x=>x.type==="expense"&&x.category===b.category)
       .reduce((s,x)=>s+Number(x.amount),0);

       if(spent>=b.amount)
         insights.push(`Your ${b.category} budget has reached its limit.`);
     });
   }

   if(data.recurring.length)
     insights.push(`${data.recurring.length} recurring payment(s) are being tracked.`);

   if(!insights.length)
     insights.push("Keep tracking consistently to build a stronger financial picture.");
 }

 box.innerHTML=insights.map(x=>`
 <div class="insight">💡 ${escapeHTML(x)}</div>
 `).join("");
}

function updateHealth(){
 const t=totals();

 let score=50;

 if(t.income>0){
   const rate=t.balance/t.income;

   if(rate>=.3)score+=25;
   else if(rate>=.15)score+=15;
   else if(rate<0)score-=25;
 }

 if(data.budgets.length)score+=10;
 if(data.goals.length)score+=10;
 if(data.recurring.length)score+=5;

 score=Math.max(0,Math.min(100,score));

 document.getElementById("healthScore").textContent=score;

 document.getElementById("healthText").textContent=
 score>=75
 ? "Your tracked finances currently show strong saving and planning activity."
 : score>=50
 ? "You have a useful financial tracking system. Keep building consistent habits."
 : "Start tracking income, expenses and budgets to understand your financial picture.";
}

function openPremium(){
 document.getElementById("modalContent").innerHTML=`

 <div style="text-align:center">
 <div class="pro-badge">FINANCE MANAGER PRO</div>
 <h2 style="margin-top:15px">Unlock Everything</h2>
 <p style="color:#8994aa;margin-bottom:20px">
 Advanced tools for serious money tracking.
 </p>
 </div>

 <div class="plan">
 <h3>
 <span>1 MONTH</span>
 <strong>₹49</strong>
 </h3>
 <p style="color:#8994aa;margin-top:7px">
 Full premium access for one month.
 </p>
 <button onclick="premiumDemo('1 month')">
 UNLOCK ₹49
 </button>
 </div>

 <div class="plan">
 <h3>
 <span>2 MONTHS</span>
 <strong>₹95</strong>
 </h3>
 <p style="color:#8994aa;margin-top:7px">
 Full premium access for two months.
 </p>
 <button onclick="premiumDemo('2 months')">
 UNLOCK ₹95
 </button>
 </div>

 <div class="card" style="margin-top:15px">
 <strong>PRO FEATURES</strong>
 <p style="color:#8994aa;font-size:12px;line-height:1.8;margin-top:8px">
 ✓ Smart receipt OCR<br>
 ✓ Advanced analytics<br>
 ✓ Unlimited budgets & goals<br>
 ✓ Advanced reports<br>
 ✓ Smart insights<br>
 ✓ Advanced recurring payments<br>
 ✓ Backup & export<br>
 ✓ Premium themes<br>
 ✓ App security
 </p>
 </div>

 <p style="font-size:10px;color:#687389;text-align:center">
 Production Android version should connect these plans to Google Play Billing.
 </p>
 `;

 openModal();
}

function premiumDemo(plan){
 data.premium=true;
 save();
 closeModal();
 showToast("Premium demo unlocked: "+plan);
}

function openAccounts(){
 document.getElementById("modalContent").innerHTML=`
 <h2>Accounts</h2>

 ${data.accounts.map(a=>`
 <div class="card">
   <strong>🏦 ${escapeHTML(a.name)}</strong>
   <p style="color:#8994aa;margin-top:5px">${escapeHTML(a.type)}</p>
 </div>
 `).join("")}

 <button class="wide-btn" onclick="addAccount()">＋ Add account</button>
 `;
 openModal();
}

function addAccount(){
 const name=prompt("Account name:");

 if(!name)return;

 data.accounts.push({
   id:Date.now(),
   name,
   type:"Custom",
   balance:0
 });

 save();
 openAccounts();
}

function openRecurring(){
 document.getElementById("modalContent").innerHTML=`
 <h2>Recurring payment</h2>
 <div class="form">

 <label>Name</label>
 <input id="recName" placeholder="Netflix / Rent / EMI">

 <label>Amount</label>
 <input id="recAmount" type="number">

 <label>Next payment date</label>
 <input id="recDate" type="date" value="${today()}">

 <label>Category</label>
 <select id="recCategory">
 ${categories.map(c=>`<option>${c}</option>`).join("")}
 </select>

 <button onclick="addRecurring()">SAVE</button>
 </div>

 <div style="margin-top:20px">
 ${data.recurring.map(x=>`
 <div class="card">
  <strong>${escapeHTML(x.name)}</strong>
  <p style="color:#8994aa">${money(x.amount)} • ${x.nextDate}</p>
 </div>
 `).join("")}
 </div>
 `;
 openModal();
}

function addRecurring(){
 const name=document.getElementById("recName").value.trim();
 const amount=Number(document.getElementById("recAmount").value);
 const date=document.getElementById("recDate").value;
 const category=document.getElementById("recCategory").value;

 if(!name||amount<=0||!date)
 return showToast("Complete all fields");

 data.recurring.push({
   id:Date.now(),
   name,
   amount,
   nextDate:date,
   category
 });

 closeModal();
 save();
 showToast("Recurring payment added");
}

function openLoans(){
 document.getElementById("modalContent").innerHTML=`
 <h2>Loans & EMI</h2>

 <div class="card">
 <div class="muted">TRACK YOUR DEBT</div>
 <p style="margin-top:10px;color:#8994aa">
 Add your loans and EMIs here to keep upcoming obligations visible.
 </p>
 </div>

 <div class="form">
 <input id="loanName" placeholder="Loan name">
 <input id="loanAmount" type="number" placeholder="Remaining amount">
 <input id="loanEmi" type="number" placeholder="Monthly EMI">
 <button onclick="addLoan()">ADD LOAN</button>
 </div>
 `;
 openModal();
}

function addLoan(){
 const name=document.getElementById("loanName").value.trim();
 const amount=Number(document.getElementById("loanAmount").value);
 const emi=Number(document.getElementById("loanEmi").value);

 if(!name||amount<=0||emi<=0)return;

 if(!data.loans)data.loans=[];

 data.loans.push({name,amount,emi});

 save();
 closeModal();
 showToast("Loan added");
}

function openTransfer(){
 document.getElementById("modalContent").innerHTML=`
 <h2>Transfer money</h2>

 <div class="form">
 <input id="transferAmount" type="number" placeholder="Amount">

 <select id="fromAccount">
 ${data.accounts.map(a=>`<option>${escapeHTML(a.name)}</option>`).join("")}
 </select>

 <select id="toAccount">
 ${data.accounts.map(a=>`<option>${escapeHTML(a.name)}</option>`).join("")}
 </select>

 <button onclick="makeTransfer()">TRANSFER</button>
 </div>
 `;
 openModal();
}

function makeTransfer(){
 const amount=Number(document.getElementById("transferAmount").value);
 const from=document.getElementById("fromAccount").value;
 const to=document.getElementById("toAccount").value;

 if(amount<=0||from===to)return showToast("Check transfer details");

 data.transactions.push({
   id:Date.now(),
   created:Date.now(),
   title:`Transfer: ${from} → ${to}`,
   amount,
   category:"Transfer",
   date:today(),
   account:from,
   type:"expense"
 });

 data.transactions.push({
   id:Date.now()+1,
   created:Date.now()+1,
   title:`Transfer: ${from} → ${to}`,
   amount,
   category:"Transfer",
   date:today(),
   account:to,
   type:"income"
 });

 closeModal();
 save();
 showToast("Transfer recorded");
}

function openScanner(){
 document.getElementById("modalContent").innerHTML=`
 <h2>Smart Receipt Scanner</h2>

 <div class="scanner-box">

 <div style="font-size:45px">📷</div>

 <p style="margin-top:10px;color:#8994aa">
 Upload a receipt image and the browser will attempt OCR.
 </p>

 <input type="file"
 id="receiptFile"
 accept="image/*"
 onchange="scanReceipt(event)">

 <div id="scanStatus" style="color:#16d9ff;font-size:12px"></div>

 <div id="ocrResult"></div>

 </div>
 `;
 openModal();
}

async function scanReceipt(event){
 const file=event.target.files[0];

 if(!file)return;

 const status=document.getElementById("scanStatus");
 status.textContent="Reading receipt...";

 try{

   const result=await Tesseract.recognize(
     file,
     "eng",
     {
       logger:m=>{
         if(m.status==="recognizing text")
           status.textContent=
           "OCR "+Math.round(m.progress*100)+"%";
       }
     }
   );

   const text=result.data.text;

   const numbers=text.match(
     /(?:₹|Rs\.?|INR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi
   )||[];

   const possible=numbers
   .map(x=>x.replace(/[^\d.]/g,""))
   .map(Number)
   .filter(x=>x>0);

   const total=possible.length
   ?Math.max(...possible)
   :0;

   document.getElementById("ocrResult").innerHTML=`
   <div class="card" style="margin-top:15px;text-align:left">
   <strong>OCR RESULT</strong>

   <p style="white-space:pre-wrap;color:#8994aa;
   font-size:11px;margin-top:10px;max-height:150px;overflow:auto">
   ${escapeHTML(text)}
   </p>

   <p style="margin-top:12px">
   Possible total:
   <strong>${money(total)}</strong>
   </p>

   <button class="wide-btn" style="margin-top:12px"
   onclick="saveScanned(${total})">
   SAVE AS EXPENSE
   </button>
   </div>
   `;

   status.textContent="Scan completed";

 }catch(e){
   status.textContent="OCR failed. Try a clearer image.";
 }
}

function saveScanned(amount){
 if(!amount){
   closeModal();
   openTransaction("expense");
   return;
 }

 data.transactions.push({
   id:Date.now(),
   created:Date.now(),
   title:"Scanned receipt",
   amount,
   category:"Other",
   date:today(),
   account:data.accounts[0]?.name||"Cash",
   type:"expense",
   notes:"Created using receipt scanner"
 });

 closeModal();
 save();
 showToast("Receipt saved");
}

function openCalendar(){
 const dates=[...data.transactions]
 .sort((a,b)=>a.date.localeCompare(b.date));

 document.getElementById("modalContent").innerHTML=`
 <h2>Financial Calendar</h2>

 ${dates.length?dates.map(t=>`
 <div class="transaction">
  <div class="tx-icon">${t.type==="income"?"↑":"↓"}</div>
  <div class="tx-info">
   <strong>${escapeHTML(t.title)}</strong>
   <small>${t.date} • ${escapeHTML(t.category)}</small>
  </div>
  <div class="amount ${t.type}">
   ${t.type==="income"?"+":"-"}${money(t.amount)}
  </div>
 </div>
 `).join(""):`<div class="empty">No calendar entries.</div>`}
 `;
 openModal();
}

function exportData(){
 const blob=new Blob(
   [JSON.stringify(data,null,2)],
   {type:"application/json"}
 );

 const a=document.createElement("a");
 a.href=URL.createObjectURL(blob);
 a.download="finance-manager-backup.json";
 a.click();

 showToast("Export started");
}

function backupData(){
 exportData();
}

function restoreData(){
 const input=document.createElement("input");
 input.type="file";
 input.accept=".json";

 input.onchange=e=>{
   const file=e.target.files[0];

   if(!file)return;

   const reader=new FileReader();

   reader.onload=()=>{
     try{
       const imported=JSON.parse(reader.result);

       if(!imported.transactions)
         throw new Error();

       data=imported;
       save();

       showToast("Backup restored");
     }catch{
       showToast("Invalid backup file");
     }
   };

   reader.readAsText(file);
 };

 input.click();
}

function settings(){
 document.getElementById("modalContent").innerHTML=`
 <h2>Settings</h2>

 <div class="menu-card">

 <button onclick="toggleTheme();closeModal()">
 🎨 Toggle theme
 </button>

 <button onclick="showToast('Security settings coming in Android build')">
 🔐 Security
 </button>

 <button onclick="showToast('Notifications require Android permissions')">
 🔔 Notifications
 </button>

 <button onclick="clearEverything()">
 🗑 Clear all local data
 </button>

 </div>
 `;
 openModal();
}

function clearEverything(){
 if(!confirm("Delete ALL Finance Manager data?"))return;

 localStorage.removeItem(KEY);

 location.reload();
}

function openModal(){
 document.getElementById("modal").classList.add("show");
}

function closeModal(){
 document.getElementById("modal").classList.remove("show");
}

function escapeHTML(value){
 return String(value??"")
 .replaceAll("&","&amp;")
 .replaceAll("<","&lt;")
 .replaceAll(">","&gt;")
 .replaceAll('"',"&quot;")
 .replaceAll("'","&#039;");
}

function updateAll(){
 updateDashboard();
 renderTransactions();
 renderBudgets();
 renderGoals();
 updateHealth();
 generateInsights();

 setTimeout(updateCharts,50);

 document.body.classList.toggle("light",data.theme==="light");
}

updateAll();
