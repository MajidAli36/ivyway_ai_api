import { app } from './app';
import { env } from './config/env';
import { startSchedulers } from './schedulers';
import { startWorker } from './workers/job.worker';

const PORT = env.PORT;

// Start schedulers
startSchedulers();

// Start job worker
startWorker();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${env.NODE_ENV}`);
  console.log(`🤖 AI Provider: ${env.LLM_PROVIDER}`);
  console.log(`🌐 Server accessible at:`);
  console.log(`   - http://localhost:${PORT}`);
  console.log(`   - http://127.0.0.1:${PORT}`);
  console.log(`   - http://0.0.0.0:${PORT}`);
  console.log(`   - Android Emulator: http://10.0.2.2:${PORT}`);
  console.log(`   - Physical Device: http://<your-computer-ip>:${PORT}`);
});

