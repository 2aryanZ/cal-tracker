const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers.cjs');
class FixedDate extends Date {
 constructor(...args){super(...(args.length?args:[2026,8,29,7,0,0]));}
 static now(){return new FixedDate().getTime();}
}
const settings={enabled:true,breakfastReminder:true,breakfastTime:'08:30',lunchReminder:true,lunchTime:'13:00',dinnerReminder:true,dinnerTime:'19:30',streakReminder:true,streakTime:'21:30'};
function subject(granted=true){
 const scheduled=[];let permissionReads=0,cancellations=0;
 const notifications={setNotificationHandler(){},async cancelAllScheduledNotificationsAsync(){cancellations++;},async getPermissionsAsync(){permissionReads++;return {granted,canAskAgain:false};},async scheduleNotificationAsync(value){scheduled.push(value);},SchedulableTriggerInputTypes:{DATE:'date'}};
 const api=load('src/services/notificationService.ts',{'react-native':{Platform:{OS:'android'}},'expo-notifications':notifications,Date:FixedDate});
 return {api,scheduled,reads:()=>permissionReads,cancellations:()=>cancellations};
}
test('disabled reminders cancel old requests without requesting permission',async()=>{
 const s=subject();await s.api.scheduleMealReminders({...settings,enabled:false});assert.equal(s.cancellations(),1);assert.equal(s.reads(),0);assert.equal(s.scheduled.length,0);
});
test('reminders skip already logged meals today and use factual future wording',async()=>{
 const s=subject();await s.api.scheduleMealReminders(settings,[{date:'2026-09-29',mealType:'breakfast'}]);assert.equal(s.scheduled.length,27);assert.equal(s.scheduled.some(n=>n.content.data.date==='2026-09-29'&&n.content.data.mealType==='breakfast'),false);assert.ok(s.scheduled.every(n=>!n.content.body.includes('unlogged')));assert.ok(s.scheduled.every(n=>n.trigger.date>new FixedDate()));
});
test('denied notification permission is reported and schedules nothing',async()=>{
 const s=subject(false);await assert.rejects(s.api.scheduleMealReminders(settings),/device settings/);assert.equal(s.scheduled.length,0);
});
