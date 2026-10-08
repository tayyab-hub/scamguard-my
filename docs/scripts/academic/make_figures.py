from pathlib import Path
import json,textwrap
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
import numpy as np
out=Path('docs/figures');out.mkdir(exist_ok=True)
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':13,'svg.fonttype':'none'})
def save(fig,name):
 fig.savefig(out/(name+'.png'),dpi=210,bbox_inches='tight',facecolor='white');fig.savefig(out/(name+'.svg'),bbox_inches='tight',facecolor='white');plt.close(fig)
def diagram(name,nodes,arrows,foot,h=9):
 fig,ax=plt.subplots(figsize=(8,h));ax.set(xlim=(0,10),ylim=(0,12));ax.axis('off')
 for key,(x,y,w,hh,label) in nodes.items():
  ax.add_patch(FancyBboxPatch((x-w/2,y-hh/2),w,hh,boxstyle='round,pad=0.08',facecolor='#f4f3ed',edgecolor='#333333',linewidth=1.3))
  wrapped='\n'.join(textwrap.fill(line,width=int(w*8.1),break_long_words=False) for line in label.split('\n'))
  ax.text(x,y,wrapped,ha='center',va='center',fontsize=12,linespacing=1.25)
 for a,b,label in arrows:
  x,y,w,hh,_=nodes[a];xx,yy,ww,hhh,_=nodes[b]
  if abs(y-yy)>1: start=(x,y-hh/2 if y>yy else y+hh/2);end=(xx,yy+hhh/2 if y>yy else yy-hhh/2)
  else: start=(x+w/2 if x<xx else x-w/2,y);end=(xx-ww/2 if x<xx else xx+ww/2,yy)
  ax.annotate('',xy=end,xytext=start,arrowprops={'arrowstyle':'->','lw':1.5,'color':'#343434'})
  if label:
   lx=(start[0]+end[0])/2+.13;ly=(start[1]+end[1])/2
   if a=='user' and b=='analysis':ly=5.45
   ax.text(lx,ly,label,fontsize=10,ha='left',va='center',bbox={'facecolor':'white','edgecolor':'none','pad':1})
 ax.text(5,.2,foot,ha='center',va='bottom',fontsize=10,linespacing=1.4)
 save(fig,name)
diagram('figure-01-architecture',{
 'browser':(5,11,7,1.2,'Browser: React / TypeScript\nUI, session cookie, explicit camera consent'),
 'vercel':(5,8.7,7,1.2,'Vercel: frontend assets + provider API rewrite\nBrowser requests same-origin /api/v1'),
 'api':(5,6.2,7,1.6,'Render: FastAPI\nValidation · sessions / CSRF · owned queries\nMessage / URL / Phone / QR engines'),
 'db':(2.6,3.3,4.2,1.6,'Neon PostgreSQL\nUsers, sessions, resets,\nprivate analyses, rate limits'),
 'mail':(7.5,3.3,3.6,1.6,'Resend\nPassword-reset mail\nInbox check pending')},
 [('browser','vercel','HTTPS'),('vercel','api','API proxy'),('api','db','SQL'),('api','mail','Mail API')],
 'No direct browser database access. Models run on the API host.\nOptional external AI review is disabled by default and excluded from evaluation.')
diagram('figure-02-data-flow',{
 'input':(5,11,7,1.1,'User selects Message, URL, Phone or QR'),
 'guard':(5,8.9,7,1.1,'Session identity + origin / CSRF + input limits'),
 'engine':(5,6.8,7,1.25,'Local engine evaluates the original input\nNo URL visit, call or automatic QR action'),
 'record':(5,4.45,7,1.3,'Create owner-scoped, versioned result\nRedact specified QR credentials before storage'),
 'show':(5,2.1,7,1.25,'Return evidence + risk + confidence + limits\nHistory retrieves the immutable assessment')},
 [('input','guard',''),('guard','engine',''),('engine','record',''),('record','show','')],
 'Upload bytes are processed transiently; camera frames stay local.\nSaved text/results remain sensitive. Legacy records are not rewritten.')
diagram('figure-03-erd',{
 'user':(5,10.8,5,1.8,'users\nid (PK), email (unique), username\npassword_hash, profile fields'),
 'session':(2.3,7.3,4.2,2,'auth_sessions\nid (PK), user_id (FK)\ntoken_hash, csrf_token_hash\nexpires_at, revoked_at'),
 'reset':(7.65,7.3,4.2,2,'password_reset_tokens\nid (PK), user_id (FK)\ntoken_hash, expires_at\nused_at'),
 'analysis':(5,3.8,7,2,'analyses\nid (PK), user_id (nullable FK), input_type\ncontent, status, evidence, risk, confidence\nmodel / rules / fusion versions'),
 'rate':(5,1.9,7,1.2,'auth_rate_limits\nkey_hash (PK), scope, window, count\nIndependent buckets: no user foreign key')},
 [('user','session','1 : many'),('user','reset','1 : many'),('user','analysis','1 : many')],
 'Selected fields; source: backend/app/db/models.py.\nLegacy NULL-owner analyses are inaccessible to authenticated users.',h=10)
diagram('figure-04-authentication',{
 'login':(5,11,7,1.15,'Login with username / email + password'),
 'verify':(5,8.95,7,1.15,'Rate limits + Argon2id verification\nInvalid credentials receive a generic rejection'),
 'session':(5,6.75,7,1.3,'Create opaque session; store token digest\nSend HttpOnly cookie; return synchronizer CSRF'),
 'request':(5,4.4,7,1.3,'Protected mutation: cookie + CSRF + exact origin\nServer derives user identity and scopes queries'),
 'reset':(5,2,7,1.4,'Reset: single-use, expiring digest-backed token\nSet new password and revoke all prior sessions\nLogout revokes the current session')},
 [('login','verify',''),('verify','session',''),('session','request','')],
 'Production cookie: Secure, HttpOnly, SameSite=None.\nThe reset lifecycle is a separate recovery path, not an automatic login step.')
diagram('figure-05-qr-workflow',{
 'upload':(2.5,10.9,4.3,1.5,'Upload PNG / JPEG / WebP\nBackend limits and decode\nTransient image bytes'),
 'camera':(7.5,10.9,4.3,1.5,'Explicit Start camera\nLocal detection → preview\nStop stream; Analyse separately'),
 'classify':(5,7.95,7,1.4,'Classify decoded text without opening it\nURL / text / Phone / Wi-Fi / payment / other'),
 'route':(5,5.6,7,1.3,'Route supported text to the existing engine\nPayment: bounded TLV / CRC consistency subset'),
 'save':(5,3.2,7,1.4,'Assess original bytes, then redact saved credentials\nReturn inert explanations and limitations\nCreate owned QR assessment')},
 [('upload','classify',''),('camera','classify',''),('classify','route',''),('route','save','')],
 '5 MiB; dimension ≤4096; ≤16,000,000 pixels; payload ≤5000 bytes.\nCRC is not merchant identity or payment legitimacy.\nCamera cancellation, navigation and deadline release its resources.')
phases=json.loads((Path(__file__).resolve().parent/'inputs/plan.json').read_text())['phases']
fig,ax=plt.subplots(figsize=(10,7));labels=[]
for i,row in enumerate(phases):
 start=int(row[5][-2:]);end=int(row[6][-2:]);ax.barh(i,end-start+0.72,left=start-.36,height=.55,color='#625f4d');labels.append(row[0])
ax.set_yticks(range(len(labels)),labels,fontsize=11);ax.invert_yaxis();ax.set_xticks(range(3,13),[str(i) for i in range(3,13)]);ax.set_xlabel('September 2026 • Asia/Kuala_Lumpur');ax.grid(axis='x',alpha=.2);ax.set_axisbelow(True);ax.spines[['top','right']].set_visible(False)
fig.text(.5,.01,'Recorded commit dates only; bar width is calendar coverage, not measured work duration.\nOriginal approved deadlines and pre-repository activities: NOT YET EVIDENCED.',ha='center',fontsize=10)
fig.tight_layout(rect=(0,.06,1,1));save(fig,'figure-06-gantt')
fig,axes=plt.subplots(1,2,figsize=(11,5.3))
for ax,matrix,labels,title in [(axes[0],[[960,4,3],[7,71,9],[0,13,93]],['LEGIT','SPAM','SCAM'],'Message • n = 1,160'),(axes[1],[[19846,89],[471,16495]],['Legitimate','Phishing'],'URL • n = 36,901')]:
 m=np.array(matrix);ax.imshow(m,cmap='Greys',vmin=0,vmax=m.max());ax.set_xticks(range(len(labels)),labels,fontsize=11);ax.set_yticks(range(len(labels)),labels,fontsize=11);ax.set_xlabel('Predicted class');ax.set_ylabel('Actual class');ax.set_title(title,fontsize=14)
 for (i,j),v in np.ndenumerate(m):ax.text(j,i,f'{v:,}',ha='center',va='center',color='white' if v>m.max()/2 else 'black',fontsize=17)
fig.text(.5,.025,'Frozen held-out classifier results. These matrices do not evaluate the final fused risk or population fraud accuracy.',ha='center',fontsize=10);fig.tight_layout(rect=(0,.08,1,1));save(fig,'figure-07-confusion-matrices')
fig,ax=plt.subplots(figsize=(8,4.5));names=['Vitest','Playwright','Pytest'];counts=[159,50,310];bars=ax.barh(names[::-1],counts[::-1],color=['#666956','#a1482c','#585858']);ax.bar_label(bars,padding=5);ax.set_xlim(0,350);ax.set_xlabel('Passed test cases (different scopes; no combined accuracy)');ax.spines[['top','right']].set_visible(False)
fig.text(.5,.015,'Merged main 4df277b • 12 September 2026\nPlaywright: 18 foundation + 8 built preview + 24 PostgreSQL. Pytest: 1 live-AI skip, 2 dependency warnings.',ha='center',fontsize=10);fig.tight_layout(rect=(0,.09,1,1));save(fig,'figure-11-testing')
print('Created 8 source-derived figures in PNG and SVG.')
