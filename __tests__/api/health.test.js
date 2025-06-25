// __tests__/api/health.test.js
import { createMocks } from 'node-mocks-http'
import handler from '../../pages/api/health'

describe('/api/health', () => {
  it('should return 200 and system status', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    
    const data = JSON.parse(res._getData())
    expect(data).toHaveProperty('status', 'ok')
    expect(data).toHaveProperty('timestamp')
    expect(typeof data.timestamp).toBe('string')
  })

  it('should handle POST method', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    
    const data = JSON.parse(res._getData())
    expect(data.status).toBe('ok')
  })

  it('should include timestamp information', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    const data = JSON.parse(res._getData())
    expect(data).toHaveProperty('timestamp')
    expect(typeof data.timestamp).toBe('string')
    expect(new Date(data.timestamp)).toBeInstanceOf(Date)
  })
})